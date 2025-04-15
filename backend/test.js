const { handler } = require('./index');

const testEvent = {
  body: JSON.stringify({ mood: "Happy" })
};

handler(testEvent).then(res => {
  console.log("Response:", res);
}).catch(err => {
  console.error("Error:", err);
});
