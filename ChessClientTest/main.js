var socket;
var messageBox;
var roomNumber;
var team;
window.onload = () =>
{
    socket = new WebSocket("ws://localhost:11000");
    socket.onopen = () =>
    {
        createMessageBox(1);    
    };
};

var createMessageBox = (id) =>
{
    if(messageBox)
        messageBox.parentNode.removeChild(messageBox);
    messageBox = null;
    switch(id)
    {
        case 1: //initial create/join room window
        {
            messageBox = createElement("div", ["messageBox"], null, null, document.body);
            let createButton = createElement("div", ["messageButton","create"], null, "Create Room", messageBox);
            let joinButton = createElement("div", ["messageButton","join"], null, "Join Room", messageBox);
            //needs to be finished
            createButton.onclick = () =>
            {
                createMessageBox(2);
            };
            joinButton.onclick = () =>
            {
                createMessageBox(3);
            };
            break;
        }
        case 2: //enter password for the room you want to create
        {
            messageBox = createElement("div", ["messageBox"], null, null, document.body);
            let table = createElement("table", ["joinTable"], null, null, messageBox);
            let tr = createElement("tr", null, null, null, table);
            createElement("td", null, null, "Create password:", tr);
            let td = createElement("td", null, null, null, tr);
            let passwordInput = createElement("input", null, null, null, td);
            let passwordError = createElement("div", ["error"], null, null, td);
            passwordInput.type = "password";

            tr = createElement("tr", null, null, null, table);
            createElement("td", null, null, null, tr);
            td = createElement("td", null, null, null, tr);
            let sendButton = createElement("div", ["messageButton", "send"], null, "Send", td);
            
            sendButton.onclick = () => {
                let password = passwordInput.value;
                if(password.includes(" "))
                {
                    passwordError.textContent = "Password cannot contain spaces.";
                    passwordInput.style.borderColor = "red";
                    return;
                }
                socket.send("c " + password);
                socket.onmessage = (e) =>
                {
                    let command = e.data.split(" ");
                    if(command.length < 3 || command[0] == "e")
                    {
                        console.log("Message error. Message: " + e.data);
                        return;
                    }
                    if(command[0] == "j" && command[1] == "s")
                    {
                        roomNumber = command[2];
                        console.log("Room number: " + roomNumber);
                        createMessageBox(4);
                    }
                }
            }
            break;
        }
        case 3: //enter number and password of the room you want to join
        {
            messageBox = createElement("div", ["messageBox"], null, null, document.body);
            let table = createElement("table", ["joinTable"], null, null, messageBox);

            let tr = createElement("tr", null, null, null, table);
            createElement("td", null, null, "Room number:", tr);
            let td = createElement("td", null, null, null, tr);
            let numberInput = createElement("input", null, null, null, td);
            numberInput.type = "text";
            let numberError = createElement("div", ["error"], null, null, td);

            tr = createElement("tr", null, null, null, table);
            createElement("td", null, null, "Room password:", tr);
            td = createElement("td", null, null, null, tr);
            let passwordInput = createElement("input", null, null, null, td);
            passwordInput.type = "password";
            let passwordError = createElement("div", ["error"], null, null, td);

            tr = createElement("tr", null, null, null, table);
            createElement("td", null, null, null, tr);
            td = createElement("td", null, null, null, tr);
            let sendButton = createElement("div", ["messageButton", "send"], null, "Send", td);

            sendButton.onclick = () =>
            {
                let password = passwordInput.value;
                let number = numberInput.value;
                let isError = false;
                if(password.includes(" "))
                {
                    passwordError.textContent = "Password cannot contain spaces.";
                    passwordInput.style.borderColor = "red";
                    isError = true;
                }
                if(isNaN(Number(number)))
                {
                    numberError.textContent = "Not a valid number.";
                    numberInput.style.borderColor = "red";
                    isError = true;
                }
                if(isError)
                    return;
                numberError.textContent = ""
                numberInput.style.borderColor = "black";
                passwordError.textContent = "";
                passwordInput.style.borderColor = "black";
                socket.send("j " + number + " " + password);
                socket.onmessage = (e) =>
                {
                    let command = e.data.split(" ");
                    if(command.length < 3)
                    {
                        console.log("Message error. Message: " + e.data);
                        if(command.length == 2)
                        {
                            if(command[0] = "e")
                            {
                                switch(command[1])
                                {
                                    case "1":
                                    {
                                        numberError.textContent = "Room doesn't exits."
                                        numberInput.style.borderColor = "red";
                                        break;
                                    }
                                    case "2":
                                    {
                                        passwordError.textContent = "Wrong password.";
                                        passwordInput.style.borderColor = "red";
                                        break;
                                    }
                                    case "3":
                                    {
                                        numberError.textContent = "Room is full."
                                        numberInput.style.borderColor = "red";
                                        break;
                                    }
                                }
                            }
                        }
                        return;
                    }
                    if(command[0] == "j" && command[1] == "s")
                    {
                        roomNumber = command[2];
                        console.log("Room number: " + roomNumber);
                        createMessageBox(4);
                    }
                }
            }
            break;
        }
        case 4: //choose team
        {
            messageBox = createElement("div", ["messageBox"], null, null, document.body);
            createElement("div", null, null, "Preffered team:", messageBox);
            let whiteButton = createElement("div", ["messageButton", "white"], null, "White", messageBox);
            let blackButton = createElement("div", ["messageButton", "black"], null, "Black", messageBox);
            whiteButton.onclick = () => 
            {
                socket.send("t 1");
                createMessageBox(5);
                socket.onmessage = (e) =>
                {
                    let command = e.data.split(" ");
                    if(command.length < 2 || command[0] == "e")
                    {
                        console.log("Message error. Message: " + e.data);
                        return;
                    }
                    if(command[0] == "t")
                    {
                        team = command[1] == "1";
                        console.log("Team: " + (team ? "white" : "black"));
                        createMessageBox(0);
                    }
                }
            }
            blackButton.onclick = () => 
            {
                socket.send("t 0");
                createMessageBox(5);
                socket.onmessage = (e) =>
                {
                    let command = e.data.split(" ");
                    if(command.length < 2 || command[0] == "e")
                    {
                        console.log("Message error. Message: " + e.data);
                        return;
                    }
                    if(command[0] == "t")
                    {
                        team = command[1] == "1";
                        console.log("Team: " + (team ? "white" : "black"));
                        createMessageBox(0);
                    }
                }
            }
            break;
        }
        case 5: //wait for othe player
        {
            messageBox = createElement("div", ["messageBox"], null, null, document.body);
            let div = createElement("div", ["centerText"], null, null, messageBox);
            createElement("div", null, null, "Waiting for the other player.", div);
            createElement("br", null, null, null, div);
            createElement("div", null, null, "Room number: " + roomNumber, div);
             
            break;
        }
        default:
            return;
    }
}

var createElement = (tag, classList, id, content, parent) =>
{
    let element = document.createElement(tag);
    if(classList)
        classList.forEach(c => {
            element.classList.add(c);
        });
    if(id)
        tag.id = id;
    if(content)
        element.textContent = content;
    if(parent)
        parent.appendChild(element);
    return element;
}