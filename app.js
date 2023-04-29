const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dataBasePath = path.join(__dirname, "covid19India.db");
const app = express();
app.use(express.json());
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dataBasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("This server at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB error at ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const stateDbToObjectDb = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const districtDbToObjectDb = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const reportSnakeToCamelCase = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStates = `
SELECT
* FROM
state
ORDER BY 
 state_id`;

  const states = await db.all(getStates);
  const statesResult = states.map((eachObject) => {
    return stateDbToObjectDb(eachObject);
  });
  response.send(statesResult);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateId = `
SELECT *
FROM
state
WHERE
state_id=${stateId}`;
  const getState = await db.get(getStateId);
  const stateResult = stateDbToObjectDb(getState);
  response.send(stateResult);
});

app.post("/districts/", async (request, response) => {
  const createDistrict = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = createDistrict;
  const postDistricts = `
INSERT INTO
district(district_name,state_id,cases, cured, active, deaths)
VALUES 
('${districtName}',
${stateId} ,
${cases},
${cured},
${active},
${deaths});
`;
  const districts = await db.run(postDistricts);
  const districtId = districts.lastId;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictId = `
SELECT *
FROM
district
WHERE
district_id=${districtId} `;
  const district = await db.get(getDistrictId);
  const districtResult = districtDbToObjectDb(district);
  response.send(districtResult);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
DELETE
FROM
district
WHERE
district_id=${districtId}`;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;

  const updateDistrictId = `
UPDATE
district
SET
district_name='${districtName}',
state_id=${stateId},
cases=${cases},
cured=${cured},
active=${active},
deaths=${deaths}`;
  await db.run(updateDistrictId);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateReport = `
SELECT
SUM(cases) AS  cases,
Sum(cured) AS  cured,
SUM(active) AS  active,
SUM(deaths)AS deaths
FROM
 district
WHERE
state_id=${stateId}`;

  const stateReport = await db.get(getStateReport);
  const stateResult = reportSnakeToCamelCase(stateReport);
  response.send(stateResult);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;

  const stateDetails = `
SELECT
state_name
FROM
state JOIN district
ON state.state_id=district.state_id
WHERE
district.district_id=${districtId}`;
  const stateName = await db.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});
module.exports = app;
