
import neo4j, {Driver, Session} from "neo4j-driver"
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url);
dotenv.config({
    path: path.resolve("/home/user/scalechat-backend/Apps", '../.env')  // 👈 Adjust as needed
  })

type UserObj = {
    firstName: string,
    lastName: string,
    imageUrl: string,
    clerkUserId: string,
    userName: string,
    createdAt: number,
    lastUpdatedAt: number
}

const fetchDriver = async (): Promise<Driver> =>{
    const URI = String(process.env.NEO4J_URI);
    const USERNAME = String(process.env.NEO4J_USERNAME);
    const PASSWORD = String(process.env.NEO4J_PASSWORD);

    try{
        const driver = neo4j.driver(URI,
            neo4j.auth.basic(USERNAME, PASSWORD))
        let isActive = await driver.getServerInfo()
        if (isActive)
            return driver
        else
            throw new Error("Unable to fetch the Server Info")
    }
    catch (err){
        throw new Error(String(err))
    }    
}

const newUser = async(user: UserObj, session: Session): Promise<boolean> => {
    const query = `
        CREATE (newAcc: Account {
            firstName: $firstName,
            lastName: $lastName,
            imageUrl: $imageUrl,
            clerkUserId: $clerkUserId,
            userName: $userName,
            createdAt: $createdAt,
            lastUpdatedAt: $lastUpdatedAt
        })
        MATCH (admin:Account {userName: $admin})
        MERGE (newAcc)-[:FOLLOWS]->(admin)
    `
    const params = {
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        clerkUserId: user.clerkUserId,
        userName: user.userName,
        createdAt: user.createdAt,
        lastUpdatedAt: user.lastUpdatedAt,
        admin: "user_30NNMTPiwGl70ewuRudCfbimEMs"
    }
    try{
        let result = await session.run(query, params)
        if (result)
            return true
        throw new Error("Unable to insert the new User")
    }
    catch (err){
        throw new Error(String(err))
    }
}

const follow = async (follower: string, leader: string, session: Session): Promise<boolean> =>{
    const query = `
        MATCH (u1: Account {userName: $follower})
        MATCH (u2: Account {userName: $leader})
        MERGE (u1)-[:FOLLOWS]->(u2)
    `
    const params = {
        follower: follower,
        leader: leader
    }
    let result = await session.run(query, params)
    if (result)
        return true
    throw new Error("Unable to add the user to Followers list")
}

const unFollow = async (follower: string, leader: string, session: Session): Promise<boolean> =>{
    if (follower && leader){
        const query = `
            MATCH (u1: Account {userName: $follower})
            MATCH (u2: Account {userName: $leader})
            MATCH (u1)-[f:FOLLOWS]->(u2)
            delete f
        `

        const params = {
            follower: follower,
            leader: leader
        }

        let result = await session.run(query, params)

        if (result)
            return true
        
        throw new Error("Unable to remove the user from Followers list")
    }
    throw new Error("Invalid Parameters")
}

const listFollowers = async (userName: string, session: Session): Promise<[string[], number]> =>{
    let friends: string[] = [], numberOfFriends: number = 0;
    const query = `
        MATCH (u1: Account {userName: $userName})
        MATCH (u)-[:FOLLOWS]->(u1)
        return u.userName;
    `
    const params = {
        userName: userName
    }
    let result = await session.run(query, params)
    if (result){
        let records = result.records
        numberOfFriends = records.length
        for (let friend of records){
            let friendId = friend.get("u.userName")
            friends.push(friendId)
        }
    }
    return [friends, numberOfFriends]
}

const listFollowing = async (userName: string, session: Session): Promise<[string[], number]> =>{
    let friends: string[] = [], numberOfFriends: number = 0

    const query = `
        MATCH (u: Account {userName: $userName})
        MATCH (u)-[:FOLLOWS]->(u1: Account)
        return u1.userName;
    `
    const params = {
        userName: userName
    }

    let result = await session.run(query, params)
    if (result){
        let records = result.records
        numberOfFriends = records.length - 1
        for (let friend of records){
            let friendId = friend.get("u1.userName")
            if (friendId === "scalechat")
                continue
            friends.push(friendId)
        }
    }

    return [friends, numberOfFriends]
}

const closeNeo4j = (driver: Driver) =>{
    try{
        driver.close()
        return true
    }
    catch (err){
        return false
    }
}


const driver = await fetchDriver()
if(!driver){
    console.log("Process Exiting")
    process.exit(1)
}
console.log("Driver Obtained")
const session = driver.session()
console.log("Session Established")

let result = await listFollowing("harry.potter", session)
console.log(result)

result = await listFollowers("harry.potter", session)
console.log(result)
console.log(closeNeo4j(driver))