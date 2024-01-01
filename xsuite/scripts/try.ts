import { World } from "../src";

const main = async () => {
  const world = World.newMainnet();
  const result = await world.query({
    sender: "erd1ff377y7qdldtsahvt28ec45zkyu0pepuup33adhr8wr2yuelwv7qpevs9e",
    callee: "erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3",
    funcName: "wrapEgld",
    value: 10,
  });
  console.log("Transaction:", result);
};

main();
