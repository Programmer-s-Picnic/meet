const $=id=>document.getElementById(id);
const localVideo=$("localVideo"),remoteVideo=$("remoteVideo");
const localPlaceholder=$("localPlaceholder"),remotePlaceholder=$("remotePlaceholder");
const statusEl=$("status");
const startBtn=$("startBtn"),muteBtn=$("muteBtn"),cameraBtn=$("cameraBtn"),shareBtn=$("shareBtn"),hangupBtn=$("hangupBtn");
const offerBtn=$("offerBtn"),answerBtn=$("answerBtn"),copyOfferBtn=$("copyOfferBtn"),copyAnswerBtn=$("copyAnswerBtn"),applyAnswerBtn=$("applyAnswerBtn");
const offerOut=$("offerOut"),offerIn=$("offerIn"),answerOut=$("answerOut"),answerIn=$("answerIn");
const messages=$("messages"),chatInput=$("chatInput"),sendBtn=$("sendBtn");

let pc=null,localStream=null,screenStream=null,dataChannel=null,cameraTrack=null;
const rtcConfig={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};

function status(text,mode=""){statusEl.textContent=text;statusEl.className="status"+(mode?" "+mode:"")}
function enableMediaControls(on){offerBtn.disabled=!on;answerBtn.disabled=!on;muteBtn.disabled=!on;cameraBtn.disabled=!on;shareBtn.disabled=!on}
function sys(text){const p=document.createElement("p");p.className="system";p.textContent=text;messages.appendChild(p);messages.scrollTop=messages.scrollHeight}
function msg(text,me=false){const p=document.createElement("p");p.className="msg"+(me?" me":"");p.textContent=(me?"You: ":"Peer: ")+text;messages.appendChild(p);messages.scrollTop=messages.scrollHeight}

async function startMedia(){
  if(localStream)return;
  try{
    localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    localVideo.srcObject=localStream;localPlaceholder.style.display="none";
    cameraTrack=localStream.getVideoTracks()[0]||null;
    enableMediaControls(true);startBtn.disabled=true;startBtn.textContent="Camera Ready";
  }catch(e){alert("Camera/microphone access failed: "+e.message)}
}

function newPeer(){
  if(pc)pc.close();
  pc=new RTCPeerConnection(rtcConfig);
  localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  pc.ontrack=e=>{const s=e.streams[0];if(s){remoteVideo.srcObject=s;remotePlaceholder.style.display="none"}};
  pc.ondatachannel=e=>{dataChannel=e.channel;bindData()};
  pc.onconnectionstatechange=refreshState;pc.oniceconnectionstatechange=refreshState;
  hangupBtn.disabled=false;
}

function refreshState(){
  if(!pc)return status("Not connected");
  const s=pc.connectionState||pc.iceConnectionState;
  if(s==="connected"||s==="completed")status("Connected","connected");
  else if(["new","checking","connecting"].includes(s))status("Connecting…","connecting");
  else status((s||"Not connected").replace(/^./,c=>c.toUpperCase()));
}

function bindData(){
  if(!dataChannel)return;
  dataChannel.onopen=()=>{chatInput.disabled=false;sendBtn.disabled=false;sys("Chat connected.")};
  dataChannel.onclose=()=>{chatInput.disabled=true;sendBtn.disabled=true;sys("Chat disconnected.")};
  dataChannel.onmessage=e=>msg(e.data);
}

function encode(d){return btoa(unescape(encodeURIComponent(JSON.stringify(d))))}
function decode(t){return JSON.parse(decodeURIComponent(escape(atob(t.trim()))))}
function waitIce(p){
  if(p.iceGatheringState==="complete")return Promise.resolve();
  return new Promise(resolve=>{
    const f=()=>{if(p.iceGatheringState==="complete"){p.removeEventListener("icegatheringstatechange",f);resolve()}};
    p.addEventListener("icegatheringstatechange",f);
  });
}

async function makeOffer(){
  try{
    newPeer();dataChannel=pc.createDataChannel("class-chat");bindData();
    await pc.setLocalDescription(await pc.createOffer());status("Preparing offer…","connecting");
    await waitIce(pc);offerOut.value=encode(pc.localDescription);copyOfferBtn.disabled=false;applyAnswerBtn.disabled=false;status("Offer ready");
  }catch(e){alert("Could not create offer: "+e.message)}
}

async function makeAnswer(){
  if(!offerIn.value.trim())return alert("Paste the teacher's offer first.");
  try{
    newPeer();await pc.setRemoteDescription(decode(offerIn.value));
    await pc.setLocalDescription(await pc.createAnswer());status("Preparing answer…","connecting");
    await waitIce(pc);answerOut.value=encode(pc.localDescription);copyAnswerBtn.disabled=false;status("Answer ready");
  }catch(e){alert("Could not create answer. Check the full offer was copied.\n\n"+e.message)}
}

async function applyAnswer(){
  if(!pc)return alert("Create a meeting offer first.");
  if(!answerIn.value.trim())return alert("Paste the student's answer first.");
  try{await pc.setRemoteDescription(decode(answerIn.value));status("Connecting…","connecting")}
  catch(e){alert("Could not use answer. Check the full answer was copied.\n\n"+e.message)}
}

async function copy(el,btn){
  if(!el.value.trim())return;
  try{await navigator.clipboard.writeText(el.value);const old=btn.textContent;btn.textContent="Copied!";setTimeout(()=>btn.textContent=old,1200)}
  catch{el.select();document.execCommand("copy")}
}

function toggleMute(){
  const tracks=localStream?.getAudioTracks()||[],enabled=tracks.some(t=>t.enabled);
  tracks.forEach(t=>t.enabled=!enabled);muteBtn.textContent=enabled?"Unmute":"Mute";
}
function toggleCamera(){
  const tracks=localStream?.getVideoTracks()||[],enabled=tracks.some(t=>t.enabled);
  tracks.forEach(t=>t.enabled=!enabled);cameraBtn.textContent=enabled?"Camera On":"Camera Off";
}

async function screenShare(){
  if(!pc)return alert("Create or join a meeting before sharing your screen.");
  if(screenStream)return stopShare();
  try{
    screenStream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
    const track=screenStream.getVideoTracks()[0],sender=pc.getSenders().find(s=>s.track?.kind==="video");
    if(sender)await sender.replaceTrack(track);
    localVideo.srcObject=screenStream;shareBtn.textContent="Stop Sharing";track.onended=stopShare;
  }catch(e){if(e.name!=="NotAllowedError")alert("Screen sharing failed: "+e.message)}
}
async function stopShare(){
  if(!screenStream)return;
  screenStream.getTracks().forEach(t=>t.stop());screenStream=null;
  const sender=pc?.getSenders().find(s=>s.track?.kind==="video");
  if(sender&&cameraTrack)await sender.replaceTrack(cameraTrack);
  localVideo.srcObject=localStream;shareBtn.textContent="Share Screen";
}

function send(){
  const text=chatInput.value.trim();
  if(!text||dataChannel?.readyState!=="open")return;
  dataChannel.send(text);msg(text,true);chatInput.value="";
}
function hangup(){
  try{dataChannel?.close()}catch{} try{pc?.close()}catch{}
  dataChannel=null;pc=null;remoteVideo.srcObject=null;remotePlaceholder.style.display="grid";
  chatInput.disabled=true;sendBtn.disabled=true;hangupBtn.disabled=true;
  offerOut.value="";answerIn.value="";answerOut.value="";
  copyOfferBtn.disabled=true;copyAnswerBtn.disabled=true;applyAnswerBtn.disabled=true;
  status("Not connected");sys("Meeting ended.");
}

startBtn.onclick=startMedia;offerBtn.onclick=makeOffer;answerBtn.onclick=makeAnswer;applyAnswerBtn.onclick=applyAnswer;
copyOfferBtn.onclick=()=>copy(offerOut,copyOfferBtn);copyAnswerBtn.onclick=()=>copy(answerOut,copyAnswerBtn);
muteBtn.onclick=toggleMute;cameraBtn.onclick=toggleCamera;shareBtn.onclick=screenShare;hangupBtn.onclick=hangup;sendBtn.onclick=send;
chatInput.addEventListener("keydown",e=>{if(e.key==="Enter")send()});
window.addEventListener("beforeunload",()=>{pc?.close();localStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop())});