const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventLogSchema = new Schema({
  eventType: String,
  elementName: String,
  timestamp: { type: Date, default: Date.now },
  participantID: String
});

module.exports = mongoose.model('EventLog', EventLogSchema);
