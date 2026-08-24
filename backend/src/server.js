import "dotenv/config";
import express from "express";
import cors from "cors";
import roomsRouter from "./routes/rooms.js";
import reservationsRouter from "./routes/reservations.js";
import adminRouter from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/rooms", roomsRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/admin", adminRouter);

app.get("/", (req, res) => res.send("융합보안학과 강의실 예약 API 서버 동작 중"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
