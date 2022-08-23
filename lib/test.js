const http = require("http");
const CircuitBreaker = require("opossum");

http.createServer((req, res) => {}).listen(5000);

function asyncFunctionThatCouldFail(x, y) {
  return new Promise((resolve, reject) => {
    console.log("do", x, y);
    setTimeout(() => {
      resolve(x * y);
    }, 1000);
  });
}

const options = {
  timeout: 2000, // If our function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 0, // After 30 seconds, try again.
};
const breaker = new CircuitBreaker(asyncFunctionThatCouldFail, options);

breaker.fire(10, 10).then(
  (value) => {
    console.log("success", value);
  },
  (reason) => {
    console.log("failed", reason);
  }
);
