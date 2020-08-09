const mongoose = require("mongoose");

const courseSchema = mongoose.Schema({
  course: [
    {
      sem1: [
        {
          FCP: {
            type: String,
          },
          ECL: {
            type: String,
          },
          EP: {
            type: String,
          },
          EN: {
            type: String,
          },
          EM: {
            type: String,
          },
          ICT1: {
            type: String,
          },
        },
      ],
    },
    {
      sem2: [],
    },
    {
      sem3: [],
    },
    {
      sem4: [],
    },
    {
      sem5: [],
    },
    {
      sem6: [],
    },
    {
      sem7: [],
    },
    {
      sem8: [],
    },
  ],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
