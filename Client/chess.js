var ip = "localhost";
var port = 11000;

var socket; //WebSocket connection to the server
var messageBox;
var roomNumber;

var mainBoard;//table element of the main board (will prolly change in future?)
var squareArray;//array of td elements representing squares on chessboard
var pieces; //[] of chess pieces {position: [], team: bool, roleNumber: number, ?hasMoved: bool, element: htmlElement}

var size = 4;//size of the board in all dimensions

var myTurn;//bool
var myTeam;// true => white, false => black

var selectedPosition; //[]
var currentMoves; //[] of: {position: [], originPiece: pieces[i], action: string, (targetPiece)}

var promotionBubbles; //pawn promotion bubbles: [1] white, [0] black
var promotedPawnPosition;

var waitingForPromotion = false;

var dimensionSymbols = [["A","B","C","D"],["1","2","3","4"],["α","β","γ","δ"],["♈","♉","♊","♋"]];
var pieceSymbols = [["♟","♜","♝","♞","♛","♚"],["♙","♖","♗","♘","♕","♔"]];
var pieceNames = ["pawn","rook","bishop","knight","queen","king"];

var moveHistoryElement;

var identityMatrix;
var rotationMatrix; //base is the identity matrix
var inverseRotationMatrix; //inverse of rotationMatrix
var rotationPlane = [0,1]; //plane the board rotates around given by the index of it't 2 axises

/* 
TODO:
Secure sockets?
*/

//setting up stuff
window.onload = () => {
    socket = new WebSocket("ws://" + ip + ":" + port);
    socket.onerror = () =>
    {
        alert("Connection error.");
    }
    socket.onopen = () =>
    {
        createMessageBox(1);    
    };
}
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
                        myTeam = command[1] == "1";
                        console.log("Team: " + (myTeam ? "white" : "black"));
                        createMessageBox(0);
                        createBoard();
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
                        myTeam = command[1] == "1";
                        console.log("Team: " + (myTeam ? "white" : "black"));
                        createMessageBox(0);
                        createBoard();
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
let createBoard = () =>
{
    myTurn = myTeam;
    mainBoard = document.getElementById("mainBoard");
    squareArray = [];
    pieces = [];
    //create board
    let mainBlack = true;
    let black = true;
    for(let n = 0; n < size; n++)
    {
        let maintr = createElement("tr", null, null, null, mainBoard, true);
        squareArray.push([]);
        for(let m = 0; m < size; m++)
        {
            let maintd = createElement("td", ["mainSquare"], null, null, maintr, false);
            let chessboard = createElement("table", [mainBlack ? "black" : "white", "chessboard"], null, null, maintd, false);
            squareArray[n].push([]);
            for(let j = 0; j < size; j++)
            {
                let tr = createElement("tr", null, null, null, chessboard, true);
                squareArray[n][m].push([]);
                for(let i = 0; i < size; i++)
                {
                    let td = createElement("td", ["square", black ? "black" : "white"], i + "-" + j + "-" + m + "-" + n, null, tr, false);
                    squareArray[n][m][j].push(td);

                    td.onclick = select;
                    black = !black;
                }
                black = !black;
            }
            black = !black;
            mainBlack = !mainBlack;
        }
        black = !black
        mainBlack = !mainBlack;
    }
    //matrices
    identityMatrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    rotateBoard(null, false);
    //set up promotion bubbles
    promotionBubbles = [document.getElementsByClassName("bubble top")[0]];
    promotionBubbles.push(document.getElementsByClassName("bubble bottom")[0]);
    for(let i = 0; i < 2; i++)
    {
        let black = true;
        let tds = [];
        for(let j = 1; j <= 4; j++)
        {
            let tr = createElement("tr", null, null, null, promotionBubbles[i], false);
            let td = createElement("td", ["bubbleSquare", black ? "black" : "white"], null, null, tr, false);
            tds.push(td);
            let div = createElement("div", [pieceNames[j], myTeam ? "white" :  "black", "piece"], null, null, td, false);
            black = !black;
        }
        tds[0].onclick = () => promotePiece(1);
        tds[1].onclick = () => promotePiece(2);
        tds[2].onclick = () => promotePiece(3);
        tds[3].onclick = () => promotePiece(4);
    }

    moveHistoryElement = document.getElementById("moveHistory");
    document.getElementById("rotateFButton").onclick = () => rotateBoard(rotationPlane, false);
    document.getElementById("rotateBButton").onclick = () => rotateBoard(rotationPlane, true);
    document.getElementById("resetRotationButton").onclick = () => rotateBoard(null, false);
    document.getElementById("planeSelector").onchange = (e) => 
    {
        rotationPlane[0] = Number(e.target.value[0]);
        rotationPlane[1] = Number(e.target.value[1]);
    };

    //put pieces on board
    resetPieces()

    //socket onMessage event
    socket.onmessage = e =>
    {
        message = e.data.split(" ");
        if(message.length <= 0)
            return;
        if(message[0] == "e")
        {
            console.log("Error code " + message[1]);
            return;
        }
        if(message[0] == "m")
        {
            let position1 = [Number(message[1]), Number(message[2]), Number(message[3]), Number(message[4])];
            let position2 = [Number(message[5]), Number(message[6]), Number(message[7]), Number(message[8])];
            turnMove(position1, position2);
            myTurn = true;
            return;
        }
        if(message[0] == "p")
        {
            let position = [Number(message[1]), Number(message[2]), Number(message[3]), Number(message[4])];
            let rank = Number(message[5]);
            turnPromote(position, rank);
        }
    }
    
}
//resets pieces
let resetPieces = () =>
{
    pieces = [];
    //pawns
    for(let m = 0; m < size; m++)
    {
        for(let i = 0; i < size; i++)
        {
            createPiece([i, 0, m, 1], 0, true);
            createPiece([i, 1, m, 0], 0, true);
            createPiece([i, 3, m, 2], 0, false);
            createPiece([i, 2, m, 3], 0, false);
        }   
    }
    createPiece([2, 0, 1, 0], 0, true);
    createPiece([1, 0, 2, 0], 0, true);
    createPiece([1, 3, 1, 3], 0, false);
    createPiece([2, 3, 2, 3], 0, false);

    //rooks
    createPiece([0, 0, 0, 0], 1, true);
    createPiece([3, 0, 0, 0], 1, true);
    createPiece([0, 0, 3, 0], 1, true);
    createPiece([3, 0, 3, 0], 1, true);
    createPiece([0, 3, 0, 3], 1, false);
    createPiece([3, 3, 0, 3], 1, false);
    createPiece([0, 3, 3, 3], 1, false);
    createPiece([3, 3, 3, 3], 1, false);

    //bishops
    createPiece([0, 0, 1, 0], 2, true);
    createPiece([3, 0, 1, 0], 2, true);
    createPiece([0, 0, 2, 0], 2, true);
    createPiece([3, 0, 2, 0], 2, true);
    createPiece([0, 3, 1, 3], 2, false);
    createPiece([3, 3, 1, 3], 2, false);
    createPiece([0, 3, 2, 3], 2, false);
    createPiece([3, 3, 2, 3], 2, false);

    //knights
    createPiece([1, 0, 0, 0], 3, true);
    createPiece([2, 0, 0, 0], 3, true);
    createPiece([1, 0, 3, 0], 3, true);
    createPiece([2, 0, 3, 0], 3, true);
    createPiece([1, 3, 0, 3], 3, false);
    createPiece([2, 3, 0, 3], 3, false);
    createPiece([1, 3, 3, 3], 3, false);
    createPiece([2, 3, 3, 3], 3, false);

    //queens
    createPiece([1, 0, 1, 0], 4, true);
    createPiece([2, 3, 1, 3], 4, false);

    //kings
    createPiece([2, 0, 2, 0], 5, true);
    createPiece([1, 3, 2, 3], 5, false);

    replacePieces();
}
//([], string, bool)
let createPiece = (position, number, team) =>
{
    if(number == 0)
        pieces.push({position: position, team: team, roleNumber: number, element: null, hasMoved: false});
    else
        pieces.push({position: position, team: team, roleNumber: number, element: null});
}
let replacePieces = () =>
{
    pieces.forEach(p => {
        if(p.element)
            p.element.parentNode.removeChild(p.element);
        let rotatedPosition = rotatePosition(p.position, rotationMatrix);
        let figure = createElement("div", [pieceNames[p.roleNumber], p.team ? "white" : "black", "piece"], null, null, squareArray[rotatedPosition[3]][rotatedPosition[2]][rotatedPosition[1]][rotatedPosition[0]], false);
        p.element = figure;
    });
}
//finds and returns the piece on position
let pieceOnPosition = (position) => 
{
    return pieces.find(x => x.position.equals(position));
}
let removePiece = (piece) =>
{
    piece.element.parentNode.removeChild(piece.element);
    pieces.splice(pieces.indexOf(piece), 1);
}
//select square
let select = (e) =>
{
    if(!myTurn)
        return;
    if(waitingForPromotion)
        return;
    let id = (e.target == e.currentTarget ? e.srcElement.id : e.srcElement.parentElement.id).split("-");
    let newPos = [Number(id[0]),Number(id[1]),Number(id[2]),Number(id[3])];
    let gamePos = rotatePosition(newPos, inverseRotationMatrix);
    let selectedElement = squareArray[newPos[3]][newPos[2]][newPos[1]][newPos[0]];
    
    if(selectedElement.classList.contains("active"))
    {
        deselect();
        moveSelectedPiece(gamePos);
        myTurn = !myTurn;
    }
    else
    {
        deselect();
        if(pieces.some(element => element.position.equals(gamePos) && element.team == (myTeam == myTurn)))
        {
            selectedPosition = gamePos;
            selectedElement.classList.add("selected");
            showMovement(selectedPosition);
        }
    }
}
//deselect square
let deselect = () =>
{   
    for(let n = 0; n < size; n++)
    {
        for(let m = 0; m < size; m++)
        {
            for(let j = 0; j < size; j++)
            {
                for(let i = 0; i < size; i++)
                {
                    let square = squareArray[n][m][j][i];
                    if(square.classList.contains("active"))
                    {
                        square.classList.remove("active");
                        square.classList.remove("move");
                        square.classList.remove("kill");
                        square.classList.remove("castling");    
                    }
                    else if(square.classList.contains("selected"))
                    {
                        square.classList.remove("selected");
                    }
                }
            }
        }
    }
}
//show where selected piece can move
let showMovement = (position) =>
{
    let piece = pieceOnPosition(position);
    currentMoves = movesOfPiece(piece);
    currentMoves.forEach(p =>
    {
        let rotatedPosition = rotatePosition(p.position, rotationMatrix);
        let square = squareArray[rotatedPosition[3]][rotatedPosition[2]][rotatedPosition[1]][rotatedPosition[0]];
        square.classList.add(p.action);
        square.classList.add("active");
    });
}
//returns list of positions where a piece can move
let movesOfPiece = (piece) =>
{
    let moves = [];
    let movePosition;
    switch(piece.roleNumber)
    {
        case 0://maybe redo? 🤷
            let mid = false;
            //up move
            for(let i = 1; i <= (piece.hasMoved ? 1 : 2); i++)
            {
                let d = piece.team ? i : -i;
                if(piece.position[1] + d >= size || piece.position[1] + d < 0)
                    break;
                movePosition = [piece.position[0], piece.position[1] + d, piece.position[2], piece.position[3]];
                if(pieces.some(p => p.position.equals(movePosition)))
                    break;
                mid = true;
                moves.push({position: movePosition, originPiece: piece, action: "move"});
            }
            //big up move
            for(let i = 1; i <= (piece.hasMoved ? 1 : 2); i++)
            {
                let d = piece.team ? i : -i;
                if(piece.position[3] + d >= size || piece.position[3] + d < 0)
                    break;
                movePosition = [piece.position[0], piece.position[1], piece.position[2], piece.position[3] + d];
                if(pieces.some(p => p.position.equals(movePosition)))
                    break;
                mid = true;
                moves.push({position: movePosition, originPiece: piece, action: "move"});
            }
            //up and big up move
            if(!piece.hasMoved && mid)
            {
                let d = piece.team ? 1 : -1
                if(piece.position[1] + d < size && piece.position[1] + d >= 0 && piece.position[3] + d < size && piece.position[3] + d >= 0)
                {
                    movePosition = [piece.position[0], piece.position[1] + d, piece.position[2], piece.position[3] + d];
                    if(!pieces.some(p => p.position.equals(movePosition)))
                        moves.push({position: movePosition, originPiece: piece, action: "move"});
                }
            }
            //kill
            let targetPiece;
            let y = piece.team ? 1 : -1;
            for(let u = 1; u <= 2; u++)
            {
                for(let r = -2; r <= 2; r++)
                {
                    if(r == 0)
                        r++;
                    let x = r > 0 ? 1 : -1;
                    movePosition = [piece.position[0] + (Math.abs(r) == 1 ? x : 0), piece.position[1] + (u == 1 ? y : 0), piece.position[2] + (Math.abs(r) == 2 ? x : 0), piece.position[3] + (u == 2 ? y : 0)]
                    targetPiece = pieces.find(p => p.team != piece.team && p.position.equals(movePosition))
                    if(targetPiece)
                    {
                        moves.push({position: movePosition, originPiece: piece, action: "kill", targetPiece: targetPiece});
                    }
                }
            }
            movePosition = [piece.position[0], piece.position[1] + (piece.team ? 1 : -1), piece.position[2], piece.position[3] + (piece.team ? 1 : -1)];
            targetPiece = pieces.find(p => p.team != piece.team && p.position.equals(movePosition));
            if(targetPiece)
                moves.push({position: movePosition, originPiece: piece, action: "kill", targetPiece: targetPiece});
            break;

        case 1:
            for(let d = 0; d < 4; d++)
            {
                for(let s = -1; s <= 1; s+=2)
                {
                    movePosition = piece.position.slice();
                    while(true)
                    {
                        movePosition[d] += s;
                        if(movePosition[d] < 0 || movePosition[d] >= size)
                            break;
                        let targetPiece = pieceOnPosition(movePosition);
                        if(targetPiece)
                        {
                            if(targetPiece.team != piece.team)
                            {
                                moves.push({position: movePosition.slice(), originPiece: piece, action: "kill", targetPiece: targetPiece});
                            }
                            break;
                        }
                        else
                        {
                            moves.push({position: movePosition.slice(), originPiece: piece, action: "move"});
                        }
                    }
                }
            }
            break;
            
        case 2:
            for(let d1 = 0; d1 < 3; d1++)
            {
                for(let d2 = d1 + 1; d2 < 4; d2++)
                {
                    for(let s1 = -1; s1 <= 1; s1+=2)
                    {
                        for(let s2 = -1; s2 <= 1; s2+=2)
                        {
                            movePosition = piece.position.slice();
                            while(true)
                            {
                                movePosition[d1] += s1;
                                movePosition[d2] += s2;
                                if(movePosition[d1] < 0 || movePosition[d1] >= size || movePosition[d2] < 0 || movePosition[d2] >= size)
                                    break;
                                let targetPiece = pieceOnPosition(movePosition);
                                if(targetPiece)
                                {
                                    if(targetPiece.team != piece.team)
                                    {
                                        moves.push({position: movePosition.slice(), originPiece: piece, action: "kill", targetPiece: targetPiece});
                                    }
                                    break;
                                }
                                else
                                {
                                    moves.push({position: movePosition.slice(), originPiece: piece, action: "move"});
                                }
                            }
                        }   
                    }
                }
            }
            break;
            
        case 3:
            for(let d1 = 0; d1 < 3; d1++)
            {
                for(let d2 = d1 + 1; d2 < 4; d2++)
                {
                    for(let s1 = -1; s1 <= 1; s1 += 2)
                    {
                        for(let s2 = -1; s2 <= 1; s2 += 2)
                        {
                            for(let c1 = 1; c1 <= 2; c1++)
                            {
                                
                                let c2 = 3 - c1;
                                movePosition = piece.position.slice();
                                movePosition[d1] += s1 * c1;
                                movePosition[d2] += s2 * c2;
                                if(movePosition[d1] >= 0 && movePosition[d1] < size && movePosition[d2] >= 0 && movePosition[d2] < size)
                                {
                                    let targetPiece = pieceOnPosition(movePosition);
                                    if(targetPiece)
                                    {
                                        if(targetPiece.team != piece.team)
                                        {
                                            moves.push({position: movePosition, originPiece: piece, action: "kill", targetPiece: targetPiece});
                                        }
                                    }
                                    else
                                    {
                                        moves.push({position: movePosition, originPiece: piece, action: "move"});
                                    }
                                }
                            }
                        }   
                    }
                }
            }
            break;

        case 4:
            for(let d = 0; d < 4; d++)
            {
                for(let s = -1; s <= 1; s+=2)
                {
                    movePosition = piece.position.slice();
                    while(true)
                    {
                        movePosition[d] += s;
                        if(movePosition[d] < 0 || movePosition[d] >= size)
                            break;
                        let targetPiece = pieceOnPosition(movePosition);
                        if(targetPiece)
                        {
                            if(targetPiece.team != piece.team)
                            {
                                moves.push({position: movePosition.slice(), originPiece: piece, action: "kill", targetPiece: targetPiece});
                            }
                            break;
                        }
                        else
                        {
                            moves.push({position: movePosition.slice(), originPiece: piece, action: "move"});
                        }
                    }
                }
            }
            for(let d1 = 0; d1 < 3; d1++)
            {
                for(let d2 = d1 + 1; d2 < 4; d2++)
                {
                    for(let s1 = -1; s1 <= 1; s1+=2)
                    {
                        for(let s2 = -1; s2 <= 1; s2+=2)
                        {
                            movePosition = piece.position.slice();
                            while(true)
                            {
                                movePosition[d1] += s1;
                                movePosition[d2] += s2;
                                if(movePosition[d1] < 0 || movePosition[d1] >= size || movePosition[d2] < 0 || movePosition[d2] >= size)
                                    break;
                                let targetPiece = pieceOnPosition(movePosition);
                                if(targetPiece)
                                {
                                    if(targetPiece.team != piece.team)
                                    {
                                        moves.push({position: movePosition.slice(), originPiece: piece, action: "kill", targetPiece: targetPiece});
                                    }
                                    break;
                                }
                                else
                                {
                                    moves.push({position: movePosition.slice(), originPiece: piece, action: "move"});
                                }
                            }
                        }   
                    }
                }
            }
            break;

        case 5:
            movePosition = [0,0,0,0]
            for(let i = -1; i <= 1; i++)
            {
                movePosition[0] = piece.position[0] + i;
                
                if(movePosition[0] >= 0 && movePosition[0] < size)
                    for(let j = -1; j <= 1; j++)
                    {
                        movePosition[1] = piece.position[1] + j;
                        if(movePosition[1] >= 0 && movePosition[1] < size)
                            for(let k = -1; k <= 1; k++)
                            {
                                movePosition[2] = piece.position[2] + k;
                                if(movePosition[2] >= 0 && movePosition[2] < size)
                                    for(let m = -1; m <= 1; m++)
                                    {
                                        movePosition[3] = piece.position[3] + m;
                                        if(movePosition[3] >= 0 && movePosition[3] < size && !(i == 0 && j == 0 && k == 0 && m == 0))
                                        {
                                            let targetPiece = pieceOnPosition(movePosition);
                                            if(targetPiece)
                                            {
                                                if(targetPiece.team != piece.team)
                                                {
                                                    moves.push({position: movePosition.slice(), originPiece: piece, action: "kill", targetPiece: targetPiece});
                                                }
                                            }
                                            else
                                            {
                                                moves.push({position: movePosition.slice(), originPiece: piece, action: "move"});
                                            }
                                        }
                                    }   
                            }   
                    }   
            }
            break;
    }
    return moves;
}
//move piece
let moveSelectedPiece = (position) =>
{  
    let move = currentMoves.find(m => m.position.equals(position));
    piece = move.originPiece;
    let position1 = piece.position;
    turnMove(position1, position);
    socket.send("m " + position1[0] + " " + position1[1] + " " + position1[2] + " " + position1[3] + " " + position[0] + " " + position[1] + " " + position[2] + " " + position[3])
    //pawn promotion //////////🤷🔫
    if(piece.roleNumber == 0 && piece.team == myTeam && ((piece.team && piece.position[1] == size-1 && piece.position[3] == size-1) || (!piece.team && piece.position[1] == 0 && piece.position[3] == 0)))
    {
        placeBubble(rotatePosition(position, rotationMatrix));
    }
}

//places promotion bubble on position
let placeBubble = (position) =>
{
    let rect = squareArray[position[3]][position[2]][position[1]][position[0]].getBoundingClientRect();
    let width = document.documentElement.clientWidth;
    let height = document.documentElement.clientHeight;
    let vmin = Math.min(width, height);
    let l = ((rect.left - (width - vmin) / 2) / vmin) * 100;
    let t = ((rect.top - (height - vmin) / 2) / vmin) * 100;
    
    let bubble = position[3] < 2 ? promotionBubbles[1] : promotionBubbles[0];
    bubble.style.left = "calc(50% - 50vmin + " + l + "vmin)";
    bubble.style.top = "calc(50% - 50vmin + " + t + "vmin)";
    bubble.style.visibility = "visible";
    promotedPawnPosition = rotatePosition(position, inverseRotationMatrix);
}
//promotes the pawnToBePromoted pawn
let promotePiece = (newRank) => //string
{
    promotionBubbles[0].style.visibility = "hidden";
    promotionBubbles[1].style.visibility = "hidden";
    turnPromote(promotedPawnPosition, newRank);
    socket.send("p " + promotedPawnPosition[0] + " " + promotedPawnPosition[1] + " " + promotedPawnPosition[2] + " " + promotedPawnPosition[3] + " " + newRank);
}

let turnMove = (position1, position2) => 
{   
    //killing targetted piece
    let enemyPiece = pieceOnPosition(position2);
    if(enemyPiece)
    {
        removePiece(enemyPiece)
    }
    //moving piece
    let piece = pieceOnPosition(position1);
    piece.position = position2;
    if(piece.roleNumber == 0) //if piece is pawn
    {
        piece.hasMoved = true;
    }
    let screenPos = rotatePosition(position2, rotationMatrix);
    squareArray[screenPos[3]][screenPos[2]][screenPos[1]][screenPos[0]].appendChild(piece.element);
    //adding move to history
    let string = pieceSymbols[piece.team ? 1 : 0][piece.roleNumber]
        + "[" + positionToString(position1) + "]"
        + " => "
        + ((enemyPiece != null) ? pieceSymbols[enemyPiece.team ? 1 : 0][enemyPiece.roleNumber] : "")
        + "[" + positionToString(position2) + "]"
        + String.fromCharCode(10, 13);
    moveHistoryElement.value += string;
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;

    if(piece.roleNumber == 0 && ((piece.team && piece.position[1] == size-1 && piece.position[3] == size-1) || (!piece.team && piece.position[1] == 0 && piece.position[3] == 0)))
        waitingForPromotion = true;

}
let turnPromote = (position, newRank) =>
{
    let piece = pieceOnPosition(position);
    //adding promotion to history
    let string = pieceSymbols[piece.team ? 1 : 0][piece.roleNumber]
        + "[" + positionToString(position) + "]"
        + " => "
        + pieceSymbols[piece.team ? 1 : 0][newRank]
        + String.fromCharCode(10, 13);
    moveHistoryElement.value += string;
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
    //promoting
    piece.roleNumber = newRank;
    piece.element.classList.remove("pawn");
    piece.element.classList.add(pieceNames[newRank]);
    waitingForPromotion = false;
    
}
let rotateBoard = (plane, clockwise) => 
{
    deselect();
    if(plane == null)
    {
        rotationMatrix = copyMatrix(identityMatrix);
        inverseRotationMatrix = copyMatrix(identityMatrix);
        if(!myTeam)
        {
            rotateBoard([0,2], false, false);
            rotateBoard([0,2], false, false);
        }
        if(squareArray[0][0][0][0].classList.contains("white"))
        {
            squareArray.forEach(s1 => s1.forEach(s2 => s2.forEach(s3 => s3.forEach(s4 => {
                if(s4.classList.contains("white"))
                {
                    s4.classList.remove("white");
                    s4.classList.add("black");
                }
                else
                {
                    s4.classList.remove("black");
                    s4.classList.add("white");    
                }
            }))));
        }
    }
    else
    {
        squareArray.forEach(s1 => s1.forEach(s2 => s2.forEach(s3 => s3.forEach(s4 => {
            if(s4.classList.contains("white"))
            {
                s4.classList.remove("white");
                s4.classList.add("black");
            }
            else
            {
                s4.classList.remove("black");
                s4.classList.add("white");    
            }
        }))));
        rotationMatrix = multiplyMatrices(createRotationMatrix(plane, clockwise), rotationMatrix);
        inverseRotationMatrix = multiplyMatrices(inverseRotationMatrix, createRotationMatrix(plane, !clockwise));
    }
    replacePieces();
}

/* helping functions */
Array.prototype.equals = function(comparison) //Are the values of two arrays equal?
{
    if(this.length != comparison.length)
        return false;
    for(let i = 0; i < this.length; i++)
        if(this[i] != comparison[i])
            return false;
    return true;
}
let positionToString = (position) =>
{
    let string = "";
    for(let i = 0; i < 4; i++)
    {
        string += dimensionSymbols[i][position[i]];
        if(i < 3)
            string += "-"
    }
    return string;
}
let rotatePosition = (position, matrix) => //multiplies the rotationMatrix by a position vector
{
    let rotatedPosition = [0,0,0,0];
    for(let i = 0; i < 4; i++)
    {
        for(let j = 0; j < 4; j++)
        {
            rotatedPosition[i] += matrix[i][j] * (position[j] - 1.5);
        }
        rotatedPosition[i] = Math.floor(rotatedPosition[i] + 1.5);
    }
    return rotatedPosition;
}
let multiplyMatrices = (a, b) => //multiplies 2 matrices
{
    let c = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for(let j = 0; j < 4; j++)
    {
        for(let i = 0; i < 4; i++)
        {
            for(let k = 0; k < 4; k++)
            {
                c[j][i] += a[j][k] * b[k][i]
            }
        }   
    }
    return c;
}
let createRotationMatrix = (plane, clockwise) => //creates a rotation matrix, that defines rotation around the plane given by [0,0] of indexes of the two axises that define it and whether it'll go 90° clockwise or counterclockwise 
{
    axises = [0,1,2,3].filter(x => !plane.includes(x));
    let c  = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    c[plane[0]][plane[0]] = 1;
    c[plane[1]][plane[1]] = 1;
    c[axises[0]][axises[1]] = clockwise ? 1 : -1;
    c[axises[1]][axises[0]] = clockwise ? -1 : 1;
    return c;
}
let copyMatrix = (matrix) => 
{
    let a = [];
    matrix.forEach(l => {
        a.push(l.slice());
    });
    return a;
}
let createElement = (tag, classList, id, content, parent, first) => //creates a new element (string, [string], string, string, element, bool)
{
    let element = document.createElement(tag);
    if(classList)
        classList.forEach(c => {
            element.classList.add(c);
        });
    if(id)
        element.id = id;
    if(content)
        element.textContent = content;
    if(parent)
    {
        if(first)
            parent.insertBefore(element, parent.firstChild);
        else
            parent.appendChild(element);
    }
    return element;
}