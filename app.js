const $=id=>document.getElementById(id);
const statusEl=$("status"),joinCard=$("joinCard"),meeting=$("meeting");
const hostTab=$("hostTab"),guestTab=$("guestTab"),hostPanel=$("hostPanel"),guestPanel=$("guestPanel"),modeTabs=$("modeTabs");
const joinHeading=$("joinHeading"),joinSubheading=$("joinSubheading");
const startHostBtn=$("startHostBtn"),hostStep1=$("hostStep1"),hostStep2=$("hostStep2"),inviteLink=$("inviteLink"),copyInviteBtn=$("copyInviteBtn"),shareInviteBtn=$("shareInviteBtn"),whatsappInviteBtn=$("whatsappInviteBtn"),replyInput=$("replyInput"),finishHostBtn=$("finishHostBtn");
const guestInviteInput=$("guestInviteInput"),guestManualBox=$("guestManualBox"),linkedInviteBox=$("linkedInviteBox"),joinBtn=$("joinBtn"),guestReplyBox=$("guestReplyBox"),guestReplyCode=$("guestReplyCode"),copyReplyBtn=$("copyReplyBtn"),whatsappReplyBtn=$("whatsappReplyBtn");
const remoteVideo=$("remoteVideo"),remoteEmpty=$("remoteEmpty"),localShareBox=$("localShareBox"),localShareVideo=$("localShareVideo");
const micBtn=$("micBtn"),shareBtn=$("shareBtn"),playSoundBtn=$("playSoundBtn"),requestControlBtn=$("requestControlBtn"),requestBrowserControlBtn=$("requestBrowserControlBtn"),ludoToggleBtn=$("ludoToggleBtn"),hangupBtn=$("hangupBtn");
const controlRequest=$("controlRequest"),allowControlBtn=$("allowControlBtn"),denyControlBtn=$("denyControlBtn"),remotePointer=$("remotePointer"),remoteControlBadge=$("remoteControlBadge");
const browserControlRequest=$("browserControlRequest"),allowBrowserControlBtn=$("allowBrowserControlBtn"),denyBrowserControlBtn=$("denyBrowserControlBtn"),browserControlState=$("browserControlState");
const workspaceFrame=$("workspaceFrame"),workspaceUrl=$("workspaceUrl"),workspaceTarget=$("workspaceTarget"),workspaceGoBtn=$("workspaceGoBtn"),workspaceNewTabBtn=$("workspaceNewTabBtn"),workspaceBackBtn=$("workspaceBackBtn"),workspaceForwardBtn=$("workspaceForwardBtn"),workspaceReloadBtn=$("workspaceReloadBtn");
const messages=$("messages"),chatInput=$("chatInput"),sendBtn=$("sendBtn");
const ludoPanel=$("ludoPanel"),ludoCloseBtn=$("ludoCloseBtn"),ludoBoard=$("ludoBoard"),ludoTurn=$("ludoTurn"),ludoStatus=$("ludoStatus"),ludoDice=$("ludoDice"),ludoRollBtn=$("ludoRollBtn"),ludoNewBtn=$("ludoNewBtn"),ludoRedCard=$("ludoRedCard"),ludoBlueCard=$("ludoBlueCard");

let pc=null,micStream=null,micTrack=null,screenStream=null,remoteStream=null,dataChannel=null;
let screenVideoSender=null,screenAudioSender=null,primaryAudioSender=null;
let micEnabled=true,canSendPointer=false,allowPointer=false,isHost=false;
let canControlRemoteBrowser=false,allowRemoteBrowserControl=false;
let workspaceHistory=["https://editor.learnwithchampak.live/python-starter/editor/super/"],workspaceIndex=0;
let inviteFromLink="";

const LUDO_TRACK=[
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
];
const LUDO_HOME={
  red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  blue:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]]
};
const LUDO_YARD={
  red:[[2,2],[2,4],[4,2],[4,4]],
  blue:[[10,10],[10,12],[12,10],[12,12]]
};
const LUDO_START={red:0,blue:26};
const LUDO_SAFE=new Set([0,8,13,21,26,34,39,47]);
let ludoState=createLudoState();

function createLudoState(){
  return {
    turn:"red",
    dice:null,
    awaitingMove:false,
    winner:null,
    players:{red:[-1,-1,-1,-1],blue:[-1,-1,-1,-1]},
    status:"Red rolls first."
  };
}

const rtcConfig={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};

function setStatus(text,mode=""){statusEl.textContent=text;statusEl.className="status"+(mode?" "+mode:"")}
function showMeeting(){joinCard.classList.add("hidden");meeting.classList.remove("hidden")}
function systemMessage(text){const p=document.createElement("p");p.className="system";p.textContent=text;messages.appendChild(p);messages.scrollTop=messages.scrollHeight}
function chatMessage(text,me=false){const p=document.createElement("p");p.className="msg"+(me?" me":"");p.textContent=(me?"You: ":"Peer: ")+text;messages.appendChild(p);messages.scrollTop=messages.scrollHeight}

function selectHost(){
  hostTab.classList.add("active");guestTab.classList.remove("active");
  hostPanel.classList.add("active");guestPanel.classList.remove("active");
}
function selectGuest(){
  guestTab.classList.add("active");hostTab.classList.remove("active");
  guestPanel.classList.add("active");hostPanel.classList.remove("active");
}
hostTab.onclick=selectHost;
guestTab.onclick=selectGuest;

function loadInviteFromUrl(){
  const hash=location.hash.startsWith("#")?location.hash.slice(1):location.hash;
  const params=new URLSearchParams(hash);
  const raw=params.get("invite");
  if(!raw)return;
  try{
    inviteFromLink=decodeURIComponent(raw);
    decode(inviteFromLink);
    guestInviteInput.value=inviteFromLink;
    selectGuest();
    modeTabs.classList.add("hidden");
    guestManualBox.classList.add("hidden");
    linkedInviteBox.classList.remove("hidden");
    joinHeading.textContent="You are invited";
    joinSubheading.textContent="Learn With Champak Meet • Audio and screen sharing";
    joinBtn.textContent="Join This Meeting";
    setStatus("Invite received");
  }catch{
    inviteFromLink="";
    setStatus("Invalid invite");
  }
}

async function getMicrophone(){
  if(micStream)return;
  try{
    micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    micTrack=micStream.getAudioTracks()[0]||null;
    micBtn.textContent=micTrack?"Mute":"Mic unavailable";
  }catch(e){
    micStream=null;micTrack=null;micBtn.textContent="Mic unavailable";micBtn.disabled=true;
    systemMessage("Microphone was not enabled. You can still receive sound and share your screen.");
  }
}

function setupPeer(){
  if(pc)pc.close();
  pc=new RTCPeerConnection(rtcConfig);
  remoteStream=new MediaStream();
  remoteVideo.srcObject=remoteStream;

  if(micTrack)primaryAudioSender=pc.addTrack(micTrack,micStream);
  else primaryAudioSender=pc.addTransceiver("audio",{direction:"sendrecv"}).sender;

  screenVideoSender=pc.addTransceiver("video",{direction:"sendrecv"}).sender;
  screenAudioSender=pc.addTransceiver("audio",{direction:"sendrecv"}).sender;

  pc.ontrack=e=>{
    if(!remoteStream.getTracks().some(t=>t.id===e.track.id))remoteStream.addTrack(e.track);
    if(e.track.kind==="video"){
      remoteEmpty.classList.add("hidden");
      requestControlBtn.disabled=false;
    }
    remoteVideo.play().catch(()=>{playSoundBtn.textContent="Click to Play Sound"});
  };
  pc.ondatachannel=e=>{dataChannel=e.channel;bindDataChannel()};
  pc.onconnectionstatechange=refreshConnection;
  pc.oniceconnectionstatechange=refreshConnection;
}

function refreshConnection(){
  if(!pc)return;
  const s=pc.connectionState||pc.iceConnectionState;
  if(s==="connected"||s==="completed"){
    setStatus("Connected","connected");
    showMeeting();
    if(location.hash)history.replaceState(null,"",location.pathname+location.search);
  }else if(["new","checking","connecting"].includes(s))setStatus("Connecting…","connecting");
  else if(["failed","disconnected","closed"].includes(s))setStatus(s[0].toUpperCase()+s.slice(1));
}

function bindDataChannel(){
  if(!dataChannel)return;
  dataChannel.onopen=()=>{
    chatInput.disabled=false;sendBtn.disabled=false;requestBrowserControlBtn.disabled=false;ludoToggleBtn.disabled=false;
    systemMessage("Private chat/control channel connected.");
    if(isHost)syncLudoState();else sendPacket({type:"ludo-sync-request"});
  };
  dataChannel.onclose=()=>{chatInput.disabled=true;sendBtn.disabled=true;canSendPointer=false;requestControlBtn.disabled=true;requestBrowserControlBtn.disabled=true;ludoToggleBtn.disabled=true;canControlRemoteBrowser=false;workspaceTarget.options[1].disabled=true};
  dataChannel.onmessage=e=>{
    let packet;
    try{packet=JSON.parse(e.data)}catch{packet={type:"chat",text:e.data}}
    if(packet.type==="chat")chatMessage(packet.text);
    if(packet.type==="control-request")controlRequest.classList.remove("hidden");
    if(packet.type==="control-granted"){
      canSendPointer=true;remoteControlBadge.textContent="Remote pointer enabled";remoteControlBadge.classList.remove("hidden");
      requestControlBtn.textContent="Remote Pointer Active";systemMessage("Remote pointer permission granted.");
    }
    if(packet.type==="control-denied"){canSendPointer=false;requestControlBtn.textContent="Request Remote Pointer";systemMessage("Remote pointer request was declined.")}
    if(packet.type==="control-revoked"){canSendPointer=false;requestControlBtn.textContent="Request Remote Pointer";remoteControlBadge.classList.add("hidden");systemMessage("Remote pointer permission ended.")}
    if(packet.type==="pointer"&&allowPointer)showRemotePointer(packet);
    if(packet.type==="browser-control-request")browserControlRequest.classList.remove("hidden");
    if(packet.type==="browser-control-granted"){
      canControlRemoteBrowser=true;
      workspaceTarget.options[1].disabled=false;
      workspaceTarget.value="remote";
      requestBrowserControlBtn.textContent="Browser Control Granted";
      browserControlState.textContent="Remote control available";
      browserControlState.className="workspace-state allowed";
      systemMessage("Remote browser workspace control granted.");
    }
    if(packet.type==="browser-control-denied"){
      canControlRemoteBrowser=false;
      workspaceTarget.options[1].disabled=true;
      workspaceTarget.value="local";
      requestBrowserControlBtn.textContent="Request Browser Control";
      systemMessage("Browser control request was declined.");
    }
    if(packet.type==="browser-control-revoked"){
      canControlRemoteBrowser=false;
      workspaceTarget.options[1].disabled=true;
      workspaceTarget.value="local";
      requestBrowserControlBtn.textContent="Request Browser Control";
      browserControlState.textContent="Local control";
      browserControlState.className="workspace-state";
      systemMessage("Remote browser control ended.");
    }
    if(packet.type==="ludo-sync-request"&&isHost)syncLudoState();
    if(packet.type==="ludo-state"&&validLudoState(packet.state)){
      ludoState=packet.state;
      renderLudo();
    }
    if(packet.type==="browser-command"&&allowRemoteBrowserControl)applyBrowserCommand(packet.command);
  };
}

function sendPacket(packet){if(dataChannel?.readyState==="open")dataChannel.send(JSON.stringify(packet))}
function encode(desc){return btoa(unescape(encodeURIComponent(JSON.stringify(desc))))}
function decode(text){return JSON.parse(decodeURIComponent(escape(atob(text.trim()))))}
function waitForIce(){
  if(pc.iceGatheringState==="complete")return Promise.resolve();
  return new Promise(resolve=>{
    const done=()=>{if(pc.iceGatheringState==="complete"){pc.removeEventListener("icegatheringstatechange",done);resolve()}};
    pc.addEventListener("icegatheringstatechange",done);
  });
}

function makeInviteLink(offer){
  const base=location.href.split("#")[0];
  return base+"#invite="+encodeURIComponent(offer);
}

async function startHost(){
  startHostBtn.disabled=true;setStatus("Preparing audio…","connecting");isHost=true;
  await getMicrophone();
  try{
    setupPeer();
    dataChannel=pc.createDataChannel("meet-data");bindDataChannel();
    await pc.setLocalDescription(await pc.createOffer());
    setStatus("Creating invite link…","connecting");
    await waitForIce();
    const offer=encode(pc.localDescription);
    inviteLink.value=makeInviteLink(offer);
    hostStep1.classList.add("hidden");hostStep2.classList.remove("hidden");
    setStatus("Invite link ready");
  }catch(e){
    startHostBtn.disabled=false;setStatus("Ready");
    alert("Could not start meeting: "+e.message);
  }
}

async function joinMeeting(){
  const invite=inviteFromLink||guestInviteInput.value.trim();
  if(!invite)return alert("Open an invite link or paste the invite data first.");
  joinBtn.disabled=true;setStatus("Preparing audio…","connecting");isHost=false;
  await getMicrophone();
  try{
    setupPeer();
    await pc.setRemoteDescription(decode(invite));
    await pc.setLocalDescription(await pc.createAnswer());
    setStatus("Creating reply…","connecting");
    await waitForIce();
    guestReplyCode.value=encode(pc.localDescription);
    guestReplyBox.classList.remove("hidden");
    joinBtn.classList.add("hidden");
    linkedInviteBox.classList.add("hidden");
    setStatus("Send reply code to host");
  }catch(e){
    joinBtn.disabled=false;setStatus("Invite error");
    alert("This invite link could not be used. Ask the host to create a new meeting link.\n\n"+e.message);
  }
}

async function finishHost(){
  if(!replyInput.value.trim())return alert("Paste the reply code first.");
  try{
    await pc.setRemoteDescription(decode(replyInput.value));
    setStatus("Connecting…","connecting");
    showMeeting();
  }catch(e){
    alert("That reply code could not be used. Make sure it was copied completely.\n\n"+e.message);
  }
}

async function copyTextValue(value,btn){
  try{
    await navigator.clipboard.writeText(value);
    const old=btn.textContent;btn.textContent="Copied!";
    setTimeout(()=>btn.textContent=old,1200);
  }catch{
    const temp=document.createElement("textarea");
    temp.value=value;document.body.appendChild(temp);temp.select();document.execCommand("copy");temp.remove();
  }
}

async function shareInvite(){
  const url=inviteLink.value;
  if(!url)return;
  if(navigator.share){
    try{
      await navigator.share({title:"Learn With Champak Meet",text:"Join my Learn With Champak meeting",url});
      return;
    }catch(e){
      if(e.name==="AbortError")return;
    }
  }
  await copyTextValue(url,shareInviteBtn);
}

function openWhatsApp(message){
  const whatsappUrl="https://wa.me/?text="+encodeURIComponent(message);
  window.open(whatsappUrl,"_blank","noopener,noreferrer");
}

function sendInviteOnWhatsApp(){
  const url=inviteLink.value.trim();
  if(!url)return;
  const message=[
    "Learn With Champak Meet",
    "",
    "Please join my meeting using this link:",
    url,
    "",
    "No camera is required. Open the link and press Join This Meeting."
  ].join("\n");
  openWhatsApp(message);
}

function sendReplyOnWhatsApp(){
  const reply=guestReplyCode.value.trim();
  if(!reply)return;
  const message=[
    "Learn With Champak Meet",
    "",
    "I opened your meeting invite. Here is my reply code:",
    "",
    reply,
    "",
    "Paste this into the meeting page and press Connect."
  ].join("\n");
  openWhatsApp(message);
}



function validLudoState(state){
  return !!state &&
    (state.turn==="red"||state.turn==="blue") &&
    state.players &&
    Array.isArray(state.players.red) &&
    Array.isArray(state.players.blue) &&
    state.players.red.length===4 &&
    state.players.blue.length===4;
}

function localLudoColor(){
  return isHost?"red":"blue";
}

function syncLudoState(){
  sendPacket({type:"ludo-state",state:ludoState});
}

function buildLudoBoard(){
  if(!ludoBoard||ludoBoard.children.length)return;
  const trackSet=new Set(LUDO_TRACK.map(([r,c])=>r+","+c));
  const safeCoords=new Set([...LUDO_SAFE].map(i=>LUDO_TRACK[i].join(",")));
  const redHome=new Set(LUDO_HOME.red.map(x=>x.join(",")));
  const blueHome=new Set(LUDO_HOME.blue.map(x=>x.join(",")));
  for(let r=0;r<15;r++){
    for(let c=0;c<15;c++){
      const cell=document.createElement("div");
      const key=r+","+c;
      cell.id="ludo-cell-"+r+"-"+c;
      cell.className="ludo-cell";
      if(trackSet.has(key))cell.classList.add("track");else cell.classList.add("empty");
      if(safeCoords.has(key))cell.classList.add("safe");
      if(r>=1&&r<=5&&c>=1&&c<=5)cell.classList.add("red-yard");
      if(r>=9&&r<=13&&c>=9&&c<=13)cell.classList.add("blue-yard");
      if(redHome.has(key))cell.classList.add("red-home");
      if(blueHome.has(key))cell.classList.add("blue-home");
      if(r===7&&c===7)cell.classList.add("center");
      if(r===6&&c===1)cell.classList.add("red-start");
      if(r===8&&c===13)cell.classList.add("blue-start");
      ludoBoard.appendChild(cell);
    }
  }
}

function ludoTokenCoord(color,progress,index){
  if(progress===-1)return LUDO_YARD[color][index];
  if(progress>=0&&progress<=51){
    return LUDO_TRACK[(LUDO_START[color]+progress)%52];
  }
  if(progress>=52&&progress<=57)return LUDO_HOME[color][progress-52];
  return [7,7];
}

function ludoCanMove(color,index,dice=ludoState.dice){
  if(!dice||ludoState.winner||ludoState.turn!==color)return false;
  const p=ludoState.players[color][index];
  if(p===58)return false;
  if(p===-1)return dice===6;
  return p+dice<=58;
}

function renderLudo(){
  buildLudoBoard();
  ludoBoard.querySelectorAll(".ludo-token").forEach(x=>x.remove());

  for(const color of ["red","blue"]){
    ludoState.players[color].forEach((progress,index)=>{
      const [r,c]=ludoTokenCoord(color,progress,index);
      const cell=$("ludo-cell-"+r+"-"+c);
      if(!cell)return;
      const token=document.createElement("button");
      token.type="button";
      token.className="ludo-token "+color;
      token.textContent=String(index+1);
      token.title=color+" token "+(index+1);
      const movable=ludoState.awaitingMove && ludoCanMove(color,index) && localLudoColor()===color;
      token.disabled=!movable;
      if(movable)token.classList.add("movable");
      token.addEventListener("click",()=>moveLudoToken(color,index));
      cell.appendChild(token);
    });
  }

  ludoTurn.textContent=ludoState.winner ? (ludoState.winner==="red"?"Red wins!":"Blue wins!") : (ludoState.turn==="red"?"Red":"Blue");
  ludoStatus.textContent=ludoState.status||"";
  ludoDice.textContent=ludoState.dice==null?"–":String(ludoState.dice);
  ludoRedCard.classList.toggle("active",!ludoState.winner&&ludoState.turn==="red");
  ludoBlueCard.classList.toggle("active",!ludoState.winner&&ludoState.turn==="blue");

  const myTurn=!ludoState.winner && ludoState.turn===localLudoColor();
  ludoRollBtn.disabled=!(dataChannel?.readyState==="open"&&myTurn&&!ludoState.awaitingMove);
  ludoRollBtn.textContent=myTurn ? "Roll Dice" : "Wait for "+(ludoState.turn==="red"?"Red":"Blue");
}

function rollLudoDice(){
  if(dataChannel?.readyState!=="open"||ludoState.winner)return;
  const color=localLudoColor();
  if(ludoState.turn!==color||ludoState.awaitingMove)return;

  const dice=Math.floor(Math.random()*6)+1;
  ludoState.dice=dice;
  ludoState.awaitingMove=true;

  const legal=[0,1,2,3].filter(i=>ludoCanMove(color,i,dice));
  if(!legal.length){
    ludoState.awaitingMove=false;
    if(dice===6){
      ludoState.status=(color==="red"?"Red":"Blue")+" rolled 6 but has no legal move. Roll again.";
    }else{
      ludoState.turn=color==="red"?"blue":"red";
      ludoState.status=(color==="red"?"Red":"Blue")+" rolled "+dice+" with no legal move. "+(ludoState.turn==="red"?"Red":"Blue")+" to roll.";
    }
  }else{
    ludoState.status=(color==="red"?"Red":"Blue")+" rolled "+dice+". Choose a highlighted token.";
  }
  syncLudoState();
  renderLudo();
}

function ludoGlobalPosition(color,progress){
  if(progress<0||progress>51)return null;
  return (LUDO_START[color]+progress)%52;
}

function moveLudoToken(color,index){
  if(color!==localLudoColor()||!ludoState.awaitingMove||!ludoCanMove(color,index))return;
  const dice=ludoState.dice;
  const old=ludoState.players[color][index];
  const next=old===-1?0:old+dice;
  ludoState.players[color][index]=next;

  let captured=false;
  const global=ludoGlobalPosition(color,next);
  if(global!==null&&!LUDO_SAFE.has(global)){
    const other=color==="red"?"blue":"red";
    ludoState.players[other].forEach((op,oi)=>{
      if(ludoGlobalPosition(other,op)===global){
        ludoState.players[other][oi]=-1;
        captured=true;
      }
    });
  }

  if(ludoState.players[color].every(p=>p===58)){
    ludoState.winner=color;
    ludoState.awaitingMove=false;
    ludoState.status=(color==="red"?"Red":"Blue")+" wins the game!";
  }else{
    ludoState.awaitingMove=false;
    if(dice===6){
      ludoState.status=(color==="red"?"Red":"Blue")+" moved token "+(index+1)+(captured?" and captured a token":"")+". Roll again.";
    }else{
      ludoState.turn=color==="red"?"blue":"red";
      ludoState.status=(color==="red"?"Red":"Blue")+" moved token "+(index+1)+(captured?" and captured a token":"")+". "+(ludoState.turn==="red"?"Red":"Blue")+" to roll.";
    }
  }
  syncLudoState();
  renderLudo();
}

function resetLudo(){
  ludoState=createLudoState();
  syncLudoState();
  renderLudo();
}

function toggleLudo(open){
  const shouldOpen=typeof open==="boolean"?open:ludoPanel.classList.contains("hidden");
  ludoPanel.classList.toggle("hidden",!shouldOpen);
  if(shouldOpen){
    renderLudo();
    ludoPanel.scrollIntoView({behavior:"smooth",block:"start"});
  }
}

const APPROVED_HOSTS=[
  "editor.learnwithchampak.live",
  "learnwithchampak.live",
  "dsa.learnwithchampak.live",
  "aiml.learnwithchampak.live",
  "angular.learnwithchampak.live",
  "react.learnwithchampak.live",
  "search.learnwithchampak.live",
  "programmer-s-picnic.github.io"
];

function normalizeWorkspaceUrl(raw){
  let value=(raw||"").trim();
  if(!value)return null;
  if(!/^https?:\/\//i.test(value))value="https://"+value;
  try{
    const u=new URL(value);
    if(u.protocol!=="https:")return null;
    const host=u.hostname.toLowerCase();
    const ok=APPROVED_HOSTS.includes(host)||host.endsWith(".learnwithchampak.live");
    return ok?u.href:null;
  }catch{return null}
}

function setWorkspaceUrl(url,push=true){
  const safe=normalizeWorkspaceUrl(url);
  if(!safe){
    alert("Only approved Learn With Champak / Programmer's Picnic HTTPS pages can open in this workspace.");
    return;
  }
  workspaceUrl.value=safe;
  workspaceFrame.src=safe;
  if(push){
    workspaceHistory=workspaceHistory.slice(0,workspaceIndex+1);
    workspaceHistory.push(safe);
    workspaceIndex=workspaceHistory.length-1;
  }
}

function sendOrApplyBrowserCommand(command){
  if(workspaceTarget.value==="remote"){
    if(!canControlRemoteBrowser)return alert("Request browser control first.");
    sendPacket({type:"browser-command",command});
  }else{
    applyBrowserCommand(command);
  }
}

function applyBrowserCommand(command){
  if(!command||typeof command!=="object")return;
  if(command.action==="open")setWorkspaceUrl(command.url,true);
  if(command.action==="reload")workspaceFrame.src=workspaceFrame.src;
  if(command.action==="back"&&workspaceIndex>0){
    workspaceIndex--;
    workspaceUrl.value=workspaceHistory[workspaceIndex];
    workspaceFrame.src=workspaceHistory[workspaceIndex];
  }
  if(command.action==="forward"&&workspaceIndex<workspaceHistory.length-1){
    workspaceIndex++;
    workspaceUrl.value=workspaceHistory[workspaceIndex];
    workspaceFrame.src=workspaceHistory[workspaceIndex];
  }
  if(command.action==="newtab"){
    const safe=normalizeWorkspaceUrl(command.url||workspaceUrl.value);
    if(safe)window.open(safe,"_blank","noopener,noreferrer");
  }
}

function requestBrowserControl(){
  if(dataChannel?.readyState!=="open")return alert("The control channel is not connected yet.");
  sendPacket({type:"browser-control-request"});
  requestBrowserControlBtn.textContent="Browser Control Requested…";
}

allowBrowserControlBtn.onclick=()=>{
  allowRemoteBrowserControl=true;
  browserControlRequest.classList.add("hidden");
  browserControlState.textContent="Peer may control workspace";
  browserControlState.className="workspace-state remote";
  sendPacket({type:"browser-control-granted"});
  systemMessage("Remote participant may now control approved browser-workspace navigation.");
};

denyBrowserControlBtn.onclick=()=>{
  allowRemoteBrowserControl=false;
  browserControlRequest.classList.add("hidden");
  sendPacket({type:"browser-control-denied"});
};

workspaceGoBtn.onclick=()=>sendOrApplyBrowserCommand({action:"open",url:workspaceUrl.value});
workspaceNewTabBtn.onclick=()=>sendOrApplyBrowserCommand({action:"newtab",url:workspaceUrl.value});
workspaceBackBtn.onclick=()=>sendOrApplyBrowserCommand({action:"back"});
workspaceForwardBtn.onclick=()=>sendOrApplyBrowserCommand({action:"forward"});
workspaceReloadBtn.onclick=()=>sendOrApplyBrowserCommand({action:"reload"});
workspaceUrl.addEventListener("keydown",e=>{if(e.key==="Enter")sendOrApplyBrowserCommand({action:"open",url:workspaceUrl.value})});
document.querySelectorAll(".editorShortcut").forEach(btn=>{
  btn.addEventListener("click",()=>sendOrApplyBrowserCommand({action:"open",url:btn.dataset.url}));
});

function toggleMic(){
  if(!micTrack)return;
  micEnabled=!micEnabled;micTrack.enabled=micEnabled;micBtn.textContent=micEnabled?"Mute":"Unmute";
}

async function shareScreen(){
  if(screenStream)return stopSharing();
  try{
    screenStream=await navigator.mediaDevices.getDisplayMedia({
      video:true,audio:true,systemAudio:"include",surfaceSwitching:"include",selfBrowserSurface:"exclude"
    });
    const v=screenStream.getVideoTracks()[0],a=screenStream.getAudioTracks()[0];
    await screenVideoSender.replaceTrack(v);
    if(a)await screenAudioSender.replaceTrack(a);
    localShareVideo.srcObject=screenStream;
    localShareBox.classList.remove("hidden");
    shareBtn.textContent="Stop Sharing";
    v.onended=stopSharing;
    if(!a)systemMessage("Screen shared. No system/tab audio track was provided by the browser for this share source.");
    else systemMessage("Screen and available share audio are being sent.");
  }catch(e){if(e.name!=="NotAllowedError")alert("Screen sharing failed: "+e.message)}
}

async function stopSharing(){
  if(!screenStream)return;
  screenStream.getTracks().forEach(t=>t.stop());
  screenStream=null;
  await screenVideoSender?.replaceTrack(null);
  await screenAudioSender?.replaceTrack(null);
  localShareVideo.srcObject=null;localShareBox.classList.add("hidden");shareBtn.textContent="Share Screen + Sound";
  if(allowPointer){allowPointer=false;remotePointer.classList.add("hidden");sendPacket({type:"control-revoked"})}
}

function requestPointer(){
  if(dataChannel?.readyState!=="open")return alert("The control channel is not connected yet.");
  sendPacket({type:"control-request"});requestControlBtn.textContent="Pointer Requested…";
}
allowControlBtn.onclick=()=>{allowPointer=true;controlRequest.classList.add("hidden");sendPacket({type:"control-granted"});systemMessage("Remote pointer allowed. You can revoke it by stopping screen sharing or hanging up.")};
denyControlBtn.onclick=()=>{allowPointer=false;controlRequest.classList.add("hidden");sendPacket({type:"control-denied"})};

function pointerPacket(e,action){
  if(!canSendPointer||!remoteEmpty.classList.contains("hidden"))return;
  const r=remoteVideo.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
  const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
  sendPacket({type:"pointer",x,y,action});
}
remoteVideo.addEventListener("pointermove",e=>pointerPacket(e,"move"));
remoteVideo.addEventListener("click",e=>pointerPacket(e,"click"));

function showRemotePointer(p){
  if(localShareBox.classList.contains("hidden"))return;
  remotePointer.style.left=(p.x*100)+"%";remotePointer.style.top=(p.y*100)+"%";remotePointer.classList.remove("hidden");
  if(p.action==="click"){remotePointer.classList.remove("click");void remotePointer.offsetWidth;remotePointer.classList.add("click")}
}

function sendChat(){
  const text=chatInput.value.trim();if(!text)return;
  sendPacket({type:"chat",text});chatMessage(text,true);chatInput.value="";
}

async function playRemoteSound(){
  remoteVideo.muted=false;remoteVideo.volume=1;
  try{await remoteVideo.play();playSoundBtn.textContent="Sound On"}catch{playSoundBtn.textContent="Play Sound"}
}

function hangUp(){
  if(allowRemoteBrowserControl)sendPacket({type:"browser-control-revoked"});
  try{dataChannel?.close()}catch{} try{pc?.close()}catch{}
  micStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop());
  location.href=location.href.split("#")[0];
}

startHostBtn.onclick=startHost;
joinBtn.onclick=joinMeeting;
finishHostBtn.onclick=finishHost;
copyInviteBtn.onclick=()=>copyTextValue(inviteLink.value,copyInviteBtn);
shareInviteBtn.onclick=shareInvite;
whatsappInviteBtn.onclick=sendInviteOnWhatsApp;
copyReplyBtn.onclick=()=>copyTextValue(guestReplyCode.value,copyReplyBtn);
whatsappReplyBtn.onclick=sendReplyOnWhatsApp;
micBtn.onclick=toggleMic;
shareBtn.onclick=shareScreen;
playSoundBtn.onclick=playRemoteSound;
requestControlBtn.onclick=requestPointer;
requestBrowserControlBtn.onclick=requestBrowserControl;
ludoToggleBtn.onclick=()=>toggleLudo();
ludoCloseBtn.onclick=()=>toggleLudo(false);
ludoRollBtn.onclick=rollLudoDice;
ludoNewBtn.onclick=resetLudo;
hangupBtn.onclick=hangUp;
sendBtn.onclick=sendChat;
chatInput.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat()});
window.addEventListener("beforeunload",()=>{pc?.close();micStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop())});

buildLudoBoard();
renderLudo();
loadInviteFromUrl();
document.querySelectorAll(".nav-button[data-open-url]").forEach(button=>{
  button.addEventListener("click",()=>{
    const url=button.dataset.openUrl;
    if(url)window.open(url,"_blank","noopener,noreferrer");
  });
});
