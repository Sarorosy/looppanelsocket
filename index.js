const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
app.use(cors({ origin: '*' })); 

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    },
});

const db = mysql.createPool({
    host: "192.185.129.222",
    user: "allisoan_loop_panel_user",
    password: "U_kzPN1oXZOs",
    database: "allisoan_loop_panel_db",
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to the database:", err);
    } else {
        console.log("Connected to the MySQL database.");
        connection.release(); // Release the connection back to the pool
    }
});

async function fetchQuoteChat(quote_id) {
    try {
        const [rows] = await db.execute(`
            SELECT 
                tbl_quote_chat.sender_id, 
                tbl_admin.fld_first_name, 
                tbl_quote_chat.message, 
                tbl_quote_chat.date, 
                tbl_quote_chat.isfile, 
                tbl_quote_chat.file_path 
            FROM tbl_quote_chat
            LEFT JOIN tbl_admin ON tbl_quote_chat.sender_id = tbl_admin.id
            WHERE tbl_quote_chat.quote_id = ?
            ORDER BY tbl_quote_chat.date ASC`, [quote_id]);

        return rows;
    } catch (err) {
        console.error("Error fetching chat:", err);
        throw err;
    }
}

// Function to generate chat HTML
function getChatContentHtml(chatDetail, user_id) {
    let html = "";
    chatDetail.forEach(chatVal => {
        const { sender_id, fld_first_name, message, date, isfile, file_path } = chatVal;
        const formattedDate = new Date(date).toLocaleString();

        if (sender_id === user_id) {
            html += `
                <div class="direct-chat-msg right">
                    <div class="direct-chat-info clearfix">
                        <span class="direct-chat-name pull-right">${fld_first_name} <span class="direct-chat-timestamp">${formattedDate}</span></span>
                    </div>
                    <div class="direct-chat-text pull-right" style="max-width:70%;margin:0;">${message}`;
            if (isfile) {
                html += `
                    <br>
                    <div class="hover:bg-blue-300" style="display:flex;align-items:center;justify-content:space-between;padding:5px; margin-top:5px; border:1px solid black; border-radius:5px;background:white;color:black;">
                        <i class="fa fa-file mr-3"></i>
                        <a style="cursor:pointer; text-decoration:none;" href="${file_path}" target="_blank">View File</a>
                    </div>
                `;
            }
            html += '</div></div>';
        } else {
            html += `
                <div class="direct-chat-msg">
                    <div class="direct-chat-info clearfix">
                        <span class="direct-chat-name pull-left">${fld_first_name} <span class="direct-chat-timestamp">${formattedDate}</span></span>
                    </div>
                    <div class="direct-chat-text" style="max-width:70%;margin:0;">${message}`;
            if (isfile) {
                html += `
                    <br>
                    <div class="hover:bg-blue-300" style="display:flex;align-items:center;justify-content:space-between;padding:5px; margin-top:5px; border:1px solid black; border-radius:5px;background:white;color:black;">
                        <i class="fa fa-file mr-3"></i>
                        <a style="cursor:pointer; text-decoration:none;" href="${file_path}" target="_blank">View File</a>
                    </div>
                `;
            }
            html += '</div></div>';
        }
    });
    return html;
}

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("newRequest", (data) => {
        console.log("New Request Received:", data);

        io.emit("updateTable", data);
    });

    socket.on("sendmessage", async (data) => {
        io.emit("chatresponse", data);
    });

    socket.on("quoteSubmitted",(data)=>{
        io.emit("quoteReceived", data);
    })

    socket.on("requestedDiscount",(data)=>{
        io.emit("discountReceived", data);
    })

    socket.on("demoCompleted",(data)=>{
        io.emit("demoDone", data);
    })
    socket.on("feasabilityTransferred",(data)=>{
        io.emit("feasTransferred", data);
    })
    socket.on("feasabilityCompleted",(data)=>{
        io.emit("feasabilityDone", data);
    })
    socket.on("updateRequest",(data)=>{
        io.emit("updateQuery", data);  //after feas complted submitted to admin
    })
    socket.on("commentsEdited",(data)=>{
        io.emit("planCommentsEdited", data);  //after feas complted submitted to admin
    })

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO server is running on http://localhost:${PORT}`);
});
