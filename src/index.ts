import bodyParser = require("body-parser");
import cors = require("cors");
import express = require("express");
import AuthorizeController from "./controller/AuthorizeController";
import PaymentController from "./controller/PaymentController";
import { BuffVnDataSourceInit } from "./dataSource";

const app = express();
const port = process.env.PORT || 5000;

let controller = [
    new PaymentController(),
    new AuthorizeController()
]
app.use(bodyParser.json())
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://ec01-08-payment.herokuapp.com"
    ]
}))
controller.forEach(x => app.use("/", x._router));
BuffVnDataSourceInit().then(x => {
    app.listen(port, () => {
        console.log(`[server]: Server is running at ${port}`);
    });
}).catch(err => {
    console.error(err);

})
