//
//IP AND PORT
//
const IP_ADDRESS = window.location.hostname;
const WS_PORT = window.location.port;

//
//ACTION BUTTONS
//
const buttonStatus = {
    CONNECT: 0,
    START: 1,
    STOP: 2,
    DISCONNECT: 3,
}

var connectionButton = document.getElementById("connection-btn");
var controlButton = document.getElementById("control-btn");

var connectionButtonStatus = buttonStatus.CONNECT;
var controlButtonStatus = buttonStatus.START;

//
//CONNECTION
//
connectionButton.onclick = function(){
    if(connectionButtonStatus === buttonStatus.CONNECT){
        serverConnect();
    }else if(connectionButtonStatus === buttonStatus.DISCONNECT){
        serverDisconnect();
    }
}

//
//CONTROL
//
var currentStream;
const SAMPLING_INTERVAL = 200;

controlButton.onclick = function(){
    if(controlButtonStatus === buttonStatus.START){
        streamStart();
    }else if(controlButtonStatus === buttonStatus.STOP){
        streamStop();
    }
}

//
//ENABLE BUTTONS
//
function enableAction(enableButtons){
    for(var i = 0; i < enableButtons.length; i++){
        enableButtons[i].classList.remove("disabled-btn");
        enableButtons[i].removeAttribute("disabled");
    }
}

//
//DISABLE BUTTONS
//
function disableAction(disableButtons){
    for(var i = 0; i < disableButtons.length; i++){
        disableButtons[i].classList.add("disabled-btn");
        disableButtons[i].setAttribute("disabled", "true");
    }
}

//
//CHANGE BUTTON STATUS
//
function changeButtonStatus(changeButton, oldButtonClass, newStatusString){
    changeButton.innerHTML = newStatusString.charAt(0) + newStatusString.toLowerCase().slice(1);
    changeButton.classList.remove(oldButtonClass);
    changeButton.classList.add(newStatusString.toLowerCase() + "-btn");

    return buttonStatus[newStatusString];
}

//
//CONSOLE
//
var consoleView = document.getElementById("console-view");
var clearButton = document.getElementById("clear-btn");

//
//LOG TO CONSOLE
//
function consoleLog(messageType, messageText, isError = false){
    if(!isError){
        consoleView.innerHTML += "<span>" + messageType + ": " + messageText + "</span><br>";
    }else{
        consoleView.innerHTML += "<span class='error-message'>" + messageType + ": " + messageText + "</span><br>";
    }

    consoleView.scrollTop = consoleView.scrollHeight;
}

//
//CLEAR CONSOLE
//
function clearConsole(){
    consoleView.innerHTML = "";
    consoleView.scrollTop = consoleView.scrollHeight;
}

clearButton.onclick = clearConsole;

//
//ADJUST CONSOLE ACCORDING TO WINDOW
//
var consoleSection = document.getElementById("console");
var headingSection = document.getElementById("heading");
var actionsSection = document.getElementById("actions");
var resizeTimeot;

window.onresize = function(){
    this.clearTimeout(resizeTimeot);
    resizeTimeot = setTimeout(() => {
        consoleSection.style.maxHeight = window.innerHeight - headingSection.clientHeight - actionsSection.clientHeight + "px";
    }, 50);
}

consoleSection.style.maxHeight = window.innerHeight - headingSection.clientHeight - actionsSection.clientHeight + "px";

//
//ACCELERATION, ROTATION RATE, ORIENTATION
//
var currentAcceleration = [0, 0, 0];
var currentRotationRate = [0, 0, 0];
var currentOrientation = [0, 0, 0];

if('LinearAccelerationSensor' in window && 'Gyroscope' in window){    
    var accelerometer = new LinearAccelerationSensor();
    accelerometer.addEventListener('reading', accelerationChange, true);
    accelerometer.start();

    var gyroscope = new Gyroscope();
    gyroscope.addEventListener('reading', rotationChange, true);
    gyroscope.start();
}else{
    window.addEventListener("devicemotion", motionChange, true);
}

window.addEventListener("deviceorientation", orientationChange, true);

//
//ACCELERATION, ROTATION RATE, ORIENTATION LISTENERS
//
function accelerationChange(){
    currentAcceleration = [accelerometer.x, accelerometer.y, accelerometer.z];
}

function rotationChange(){
    currentRotationRate = [gyroscope.x, gyroscope.y, gyroscope.z];
}

function motionChange(e){
    currentAcceleration = [e.acceleration.x, e.acceleration.y, e.acceleration.z];
    currentRotationRate = [e.rotationRate.alpha, e.rotationRate.beta, e.rotationRate.gamma];
}

function orientationChange(e){
    currentOrientation = [e.alpha, e.beta, e.gamma];
}

//
//CONNECT TO SERVER
//
var webSocket;
var wsLastState;

function serverConnect(){
    disableAction([connectionButton]);

    consoleLog("CON", "Connecting...");
    wsLastState = WebSocket.CONNECTING;

    webSocket = new WebSocket("wss://" + IP_ADDRESS + ":" + WS_PORT + "/stream");

    webSocket.onopen = function(){
        wsLastState = WebSocket.OPEN;

        consoleLog("CON", "Connected");

        connectionButtonStatus = changeButtonStatus(connectionButton, "connect-btn", "DISCONNECT");
        enableAction([connectionButton, controlButton]);
    }

    webSocket.oneror = function(){
        consoleLog("CON", "Connection failed", true);
    }

    webSocket.onclose = function(){
        switch(wsLastState){
            case WebSocket.CLOSING:
                consoleLog("CON", "Disconnected");
                break;
            case WebSocket.CONNECTING:
                consoleLog("CON", "Unable to connect", true);
                break;
            case -1:
                consoleLog("CON", "Server occupied", true);
                break;
            default:
                consoleLog("CON", "Disconnected", true);
        }

        if(controlButton.disabled == false){
            disableAction([controlButton]);
        }

        if(controlButtonStatus == buttonStatus.STOP){
            streamStop();
        }
        
        if(connectionButtonStatus == buttonStatus.DISCONNECT){
            connectionButtonStatus = changeButtonStatus(connectionButton, "disconnect-btn", "CONNECT");
        }
        enableAction([connectionButton]);

        wsLastState = WebSocket.CLOSED;
    }
}

//
//DISCONNECT FROM SERVER
//
function serverDisconnect(){
    disableAction([connectionButton, controlButton]);

    consoleLog("CON", "Disconnecting...");
    wsLastState = WebSocket.CLOSING;

    webSocket.close();
}

window.onbeforeunload = serverDisconnect;

//
//START STREAMING
//
function streamStart(){
    disableAction([connectionButton]);
    consoleLog("OUT", "Stream started");

    currentStream = setInterval(streamData, SAMPLING_INTERVAL);

    controlButtonStatus = changeButtonStatus(controlButton, "start-btn", "STOP");
}

//
//STREAM DATA
//
var dataId = 0;

function streamData(){
    let data = JSON.stringify({
        id: dataId,
        deltaTime: SAMPLING_INTERVAL,
        acceleration: currentAcceleration,
        rotationRate: currentRotationRate,
        orientation: currentOrientation
    });

    consoleLog("OUT", data);
    webSocket.send(data);

    dataId++;
}

//
//STOP STREAMING
//
function streamStop(){
    clearInterval(currentStream);
    dataId = 0;

    controlButtonStatus = changeButtonStatus(controlButton, "stop-btn", "START");
    enableAction([connectionButton]);

    consoleLog("OUT", "Stream stopped");
}