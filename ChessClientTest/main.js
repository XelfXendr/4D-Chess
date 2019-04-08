var socket;
var input, log, button

window.onload = () =>
{
    socket = new WebSocket("ws://localhost:1000");
    input = document.getElementById("input");
    log = document.getElementById("log");
    button = document.getElementById("send")

    socket.onopen = () =>
    {
        writeToLog("Connected");
        button.onclick = () =>
        {
            socket.send(input.value);
            writeToLog("Sent: " + input.value);
            input.value = "";
        };

        socket.addEventListener("message", (e) => 
        {
            writeToLog("Recieved: " + e.data);
        });
    };
};

var currentTime = () =>
{
    let d = new Date();
    return d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
}
var writeToLog = (string) =>
{
    log.value = currentTime() + " " + string + String.fromCharCode(10) + log.value;
}
