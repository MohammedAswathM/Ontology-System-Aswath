const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Helper function to get a session pointing to the right database
function getSession() {
    return driver.session({
        database: process.env.NEO4J_DATABASE || 'neo4j' // This line fixes your issue
    });
}

module.exports = {
    driver,
    getSession
};