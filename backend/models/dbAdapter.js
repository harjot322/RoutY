/**
 * DB Adapter Proxy: Dynamically switches between Mongoose Model and MemoryStore
 */
const { memoryStore } = require('../utils/memoryStore');

let useMongo = false;

function setUseMongo(flag) {
  useMongo = flag;
}

function getUseMongo() {
  return useMongo;
}

function createModelProxy(mongooseModel, memoryCollectionName) {
  return new Proxy(mongooseModel, {
    get(target, prop) {
      if (useMongo) {
        return target[prop];
      } else {
        const memCol = memoryStore[memoryCollectionName];
        if (prop in memCol) {
          if (typeof memCol[prop] === 'function') {
            return memCol[prop].bind(memCol);
          }
          return memCol[prop];
        }
        return target[prop];
      }
    }
  });
}

module.exports = {
  setUseMongo,
  getUseMongo,
  createModelProxy
};
