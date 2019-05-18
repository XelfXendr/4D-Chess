/*
Created by Jan "Xelf" Bronec.
GitHub: https://github.com/XelfXendr
Copyright 2019, Jan Bronec, All rights reserved.
*/

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Fleck;

namespace FleckTestServer
{
    class Program
    {
        static WebSocketServer server;
        static List<IWebSocketConnection> socketList;
        static List<Room> rooms;
        static readonly int maxNumberOfRooms = 1000;
        static void Main()
        {
            IPAddress ip;
            int port;
            Console.Write("Enter ip address of the server: ");
            while(!IPAddress.TryParse(Console.ReadLine(), out ip))
            {
                Console.Write("Invalid address, try again: ");
            }
            Console.Write("Enter ip port of the sever 1024-49151: ");
            while (!int.TryParse(Console.ReadLine(), out port) || port < 1024 || port > 49151)
            {
                Console.Write("Invalid port, try again: ");
            }
            server = new WebSocketServer(String.Format(ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? "ws://{0}:{1}" : "ws://[{0}]:{1}", ip, port));
            socketList = new List<IWebSocketConnection>(); 
            rooms = new List<Room>();
            server.Start(socket => //start server
            {
                socket.OnOpen = () => OnOpen(socket);
                socket.OnClose = () => OnClose(socket);
                socket.OnMessage = message => FirstPhase(socket, message);
                socket.OnError = e => Console.Write(e + " " + e.Data);
            });

            //close after pressing escape
            Console.WriteLine("To stop the server, press ESC.");
            while (Console.ReadKey().Key != ConsoleKey.Escape) ;
            server.Dispose();
        }

        public static void OnOpen(IWebSocketConnection socket) //OnOpen
        {
            socketList.Add(socket);
            Console.WriteLine("[{2}] Client {0}:{1} has connected.", socket.ConnectionInfo.ClientIpAddress, socket.ConnectionInfo.ClientPort, DateTime.Now);
        }

        public static void OnClose(IWebSocketConnection socket) //OnClose
        {
            socketList.Remove(socket);
            Console.WriteLine("[{2}] Client {0}:{1} has disconnected.", socket.ConnectionInfo.ClientIpAddress, socket.ConnectionInfo.ClientPort, DateTime.Now);
        }
        public static void OnClose(IWebSocketConnection socket, Room room) //OnClose when client is in room
        {
            room.sockets.Remove(socket);
            socketList.Remove(socket);
            if (room.sockets.Count == 0)
                rooms.Remove(room);
            Console.WriteLine("[{2}] Client {0}:{1} has disconnected.", socket.ConnectionInfo.ClientIpAddress, socket.ConnectionInfo.ClientPort, DateTime.Now);
        }

        //OnMessage Events
        public static void FirstPhase(IWebSocketConnection socket, string message) //when client connects to the server
        {
            string[] command = message.Split(' ');
            if (command.Length < 1)
            {
                socket.Send("e 0");
                return;
            }
            if (command[0] == "j") //client is trying to join room
            {
                if (command.Length < 2)
                {
                    socket.Send("e 0");
                    return;
                }
                if (!int.TryParse(command[1], out int id))
                {
                    socket.Send("e 0"); //wrong command
                    return;
                }
                var room = rooms.Find(r => r.id == id);
                if (room is null)
                {
                    socket.Send("e 1"); //room doesnt exit
                    return;
                }
                if (room.sockets.Count >= 2)
                {
                    socket.Send("e 3"); //room is full
                    return;
                }
                string pass = command.Length >= 3 ? command[2] : "";
                if (room.password != pass)
                {
                    socket.Send("e 2"); //wrong password
                    return;
                }
                room.sockets.Add(socket);
                socket.OnMessage = m => SecondPhase(socket, room, m);
                socket.OnClose = () => OnClose(socket, room);
                socket.Send("j s " + id); //joined successfully
                Console.WriteLine("[{3}] Client {0}:{1} joined room {2}", socket.ConnectionInfo.ClientIpAddress, socket.ConnectionInfo.ClientPort, id, DateTime.Now);
                return;
            }
            if (command[0] == "c")//client is trying to create a room
            {
                if(rooms.Count >= maxNumberOfRooms)
                {
                    socket.Send("e 4");//maximum number if rooms reached
                    return;
                }
                int i = 0;
                while (rooms.Any(r => r.id == i))
                    i++;
                Room room = new Room(i);
                room.sockets.Add(socket);
                if (command.Length > 1)
                    room.password = command[1];
                rooms.Add(room);
                socket.OnMessage = m => SecondPhase(socket, room, m);
                socket.OnClose = () => OnClose(socket, room);
                socket.Send("j s " + i);
                Console.WriteLine("Client {0}:{1} created room {2}", socket.ConnectionInfo.ClientIpAddress, socket.ConnectionInfo.ClientPort, i);
                return;
            }
            socket.Send("e 0"); //wrong command for 1st phase
            return;
        }

        public static void SecondPhase(IWebSocketConnection socket, Room room, string message) //when client joins a room/ assign teams
        {
            string[] command = message.Split(' ');
            if (command.Length < 2) //wrong command format
            {
                socket.Send("e 0");
                return;
            }
            if (command[0] != "t") //wrong command for 2nd phase
            {
                socket.Send("e 0");
                return;
            }
            if (command[1] != "0" && command[1] != "1") //wrong command format
            {
                socket.Send("e 0");
                return;
            }
            room.preferences[room.sockets.IndexOf(socket)] = command[1] == "1";
            room.playersChose++;

            if (room.playersChose >= 2)
            {
                room.playersChose = 0;
                var sockets = room.sockets;
                if (room.preferences[0] ^ room.preferences[1])
                {
                    sockets[0].Send("t " + (room.preferences[0] ? "1" : "0"));
                    sockets[1].Send("t " + (room.preferences[1] ? "1" : "0"));
                }
                else
                {
                    int t = (new Random()).Next(2);
                    sockets[0].Send("t " + t);
                    sockets[1].Send("t " + (1 - t));
                }
                sockets[0].OnMessage = m => ThirdPhase(sockets[0], room, m);
                sockets[1].OnMessage = m => ThirdPhase(sockets[1], room, m);
            }
            return;
        }

        public static void ThirdPhase(IWebSocketConnection socket, Room room, string message) //the game
        {
            string[] command = message.Split(' ');
            if(command.Length > 0)
            {
                //move: m x1 y1 z1 w1 x2 y2 z2 w2
                //promote: p x y z w promotionNumber
                if (command[0] == "m" || command[0] == "p")
                {
                    var receiver = room.sockets.Find(s => s != socket);
                    if (!(receiver is null))
                        receiver.Send(message);
                    return;
                }
                if (command[0] == "r") //restart?
                {
                    room.playersChose++;
                    if(room.playersChose >= 2)
                    {
                        room.playersChose = 0;
                        room.sockets.ForEach(s =>
                        {
                            s.Send("r");
                            s.OnMessage = m => SecondPhase(s, room, m);
                        });
                    }
                    return;
                }
            }
            socket.Send("e 0");
            return;
        }
    }

    public class Room
    {
        public int id;
        public List<IWebSocketConnection> sockets = new List<IWebSocketConnection>();
        public bool gameInProgress = false;
        public string password = "";
        public bool[] preferences = new bool[2];
        public int playersChose = 0;
        public Room(int id)
        {
            this.id = id;
        }
    }
}
