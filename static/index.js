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
        consoleView.innerHTML += "<span class='text-danger font-weight-bold'>" + messageType + ": " + messageText + "</span><br>";
    }

    consoleSection.scrollTop = consoleSection.scrollHeight;
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

consoleSection.style.maxHeight = window.innerHeight - headingSection.clientHeight - actionsSection.clientHeight - 71 + "px";

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
// GRAPH
//

let graphType = 'acceleration';

const labelsData = [];
const accelerationData = [];
const rotationRateData = [];
const orientationData = [];


const ctx = document.getElementById('myChart');

const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'X',
            data: [],
            fill: false,
            borderColor: [
                'rgb(133,255,99)'
            ],
            borderWidth: 1
        },{
            label: 'Y',
            data: [],
            fill: false,
            borderColor: [
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
        }, {
            label: 'Z',
            data: [],
            fill: false,
            borderColor: [
                'rgb(99,151,255)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        title: {
            display: true,
            text: 'AJKLbjh'
        },
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'Data IDs'
                }
            }],
            yAxes: [{
                ticks: {
                    min: -1,
                    max: 1
                }
            }]
        }
    }
});

function updateGraph() {
    chart.data.labels = labelsData;

    switch (graphType) {
        case 'acceleration':
            chart.data.datasets[0].data = accelerationData.map(i => i.x);
            chart.data.datasets[1].data = accelerationData.map(i => i.y);
            chart.data.datasets[2].data = accelerationData.map(i => i.z);
            break;
        case 'rotationRate':
            chart.data.datasets[0].data = rotationRateData.map(i => i.x);
            chart.data.datasets[1].data = rotationRateData.map(i => i.y);
            chart.data.datasets[2].data = rotationRateData.map(i => i.z);
            break;
        case 'orientation':
            chart.data.datasets[0].data = orientationData.map(i => i.x);
            chart.data.datasets[1].data = orientationData.map(i => i.y);
            chart.data.datasets[2].data = orientationData.map(i => i.z);
            break;
    }

    chart.update();
}

//
//STREAM DATA
//
var dataId = 0;

const checkboxAcceleration = document.getElementById('checkbox-acceleration');
const checkboxRotationRate = document.getElementById('checkbox-rotation-rate');
const checkboxOrientation = document.getElementById('checkbox-orientation');

function roundValue(array){
	return array.map(item => item.toFixed(3));
}


function streamData(){
    let data = JSON.stringify({
        id: dataId,
        deltaTime: SAMPLING_INTERVAL,
        acceleration: checkboxAcceleration.checked ? roundValue(currentAcceleration) : undefined,
        rotationRate: checkboxRotationRate.checked ? roundValue(currentRotationRate) : undefined,
        orientation: checkboxOrientation.checked ? roundValue(currentOrientation) : undefined
    });


    const count = chart.data.labels.length;
    if (count > 20) {
        labelsData.shift();
        accelerationData.shift();
        rotationRateData.shift();
        orientationData.shift();
    }

    labelsData.push(dataId);
    accelerationData.push({x: currentAcceleration[0], y: currentAcceleration[1], z: currentAcceleration[2]});
    rotationRateData.push({x: currentRotationRate[0], y: currentRotationRate[1], z: currentRotationRate[2]});
    orientationData.push({x: currentOrientation[0], y: currentOrientation[1], z: currentOrientation[2]});
    updateGraph();

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

//
// NAVIGATION
//

graphSection = document.getElementById('graph');
const consoleFilterBox = document.getElementById('console-filter-box');
const navItemConsole = document.getElementById('console-nav-item');
const navItemAcceleration = document.getElementById('graph-nav-item-acceleration');
const navItemRotationRate = document.getElementById('graph-nav-item-rotation-rate');
const navItemOrientation = document.getElementById('graph-nav-item-orientation');

function consoleVisibility(value) {

    if (value) {
        consoleSection.classList.remove('element-hidden');
        consoleFilterBox.classList.remove('element-hidden');
    } else {
        consoleSection.classList.add('element-hidden');
        consoleFilterBox.classList.add('element-hidden');
    }
}

function graphVisibility(value) {

    if (value) {
        graphSection.classList.remove('element-hidden');
    } else {
        graphSection.classList.add('element-hidden');
    }
}

navItemConsole.onclick = () => {
    consoleVisibility(true);
    graphVisibility(false);
}

navItemAcceleration.onclick = () => {
    graphType = 'acceleration';
    chart.options.title.text = 'Acceleration';
    consoleVisibility(false);
    graphVisibility(true);
    updateGraph();
}
navItemRotationRate.onclick = () => {
    graphType = 'rotationRate';
    chart.options.title.text = 'Rotation Rate';
    consoleVisibility(false);
    graphVisibility(true);
    updateGraph();
}
navItemOrientation.onclick = () => {
    graphType = 'orientation';
    chart.options.title.text = 'Orientation';
    consoleVisibility(false);
    graphVisibility(true);
    updateGraph();
}
