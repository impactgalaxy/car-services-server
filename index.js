require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.U_DB}:${process.env.P_DB}@cluster0.s7sbkwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// const logger = async (req, res, next) => {
//     console.log("testing purpose : ", req.host, req.originalUrl);
//     next();
// }
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized" });
    }
    jwt.verify(token, process.env.ACCESS_USER_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized" })
        }
        req.user = decoded
        next();
    })


}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const databaseCollection_1 = client.db("practiceDatabase").collection("carServices");
        const databaseCollection_2 = client.db("practiceDatabase").collection("orders");

        // auth related api
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_USER_TOKEN, { expiresIn: "1h" })
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }).send({ success: true })

        })
        // service related api
        app.get("/services", async (req, res) => {
            const result = await databaseCollection_1.find().toArray();
            res.send(result);
        });
        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await databaseCollection_1.findOne(query);
            res.send(result);
        });
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await databaseCollection_2.insertOne(order);
            res.send(result);
        });
        app.get("/orders", verifyToken, async (req, res) => {
            const query = req.query;
            if (query?.email !== req.user?.email) {
                return res.status(403).send({ message: "Forbidden" })
            }
            let filter = {};
            if (query?.email) {
                filter = { email: query?.email }
            }
            const result = await databaseCollection_2.find(filter).toArray();
            res.send(result);
        });
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await databaseCollection_2.deleteOne(query)
            res.send(result);
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("The server for car doctor is running successfully..........")
})
app.listen(port, () => {
    console.log(`The server for car doctor is running on port: ${port}`);
})
