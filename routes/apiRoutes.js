var db = require("../models");
var dottie = require("dottie");
var moment = require('moment');

module.exports = function (app) {

  // Specializations
  app.get("/api/specializations", function (req, res) {
    db.specialization.findAll({}).then(function (dbExamples) {
      // res.json(dbExamples);
      res.json(dbExamples);
    });
  });

  // Doctors per specialization
  app.get("/api/specializations/:specialization_id/doctors", function (req, res) {
    db.sequelize.query(`SELECT s.id as specialization_id, s.specialization_name, d.id as doctor_id
      , concat(d.first_name, ' ', d.last_name) as doctor_name FROM specialization s, doctor d
      , doctor_specialization ds WHERE d.id = ds.doctor_id AND s.id = ds.specialization_id
      AND s.id = ${req.params.specialization_id};`)
      .then(([results, metadata]) => {
        // Results will be an empty array and metadata will contain the number of affected rows.
        res.json(results)
      })
  });

  // Office availability per Doctor
  app.get("/api/doctor/:doctor/office_availability", function (req, res) {
    db.sequelize.query(`SELECT o.id as officeID, ap.id as apptID
      , DATE_ADD(oda.start_time, INTERVAL con.consec*o.time_slot_per_client_in_min MINUTE) as timeSlot
      FROM office o inner join office_doctor_availability oda on(o.id=oda.office_id )
      inner join consec con on((TIME_TO_SEC(TIMEDIFF(oda.end_time, oda.start_time))/(60*o.time_slot_per_client_in_min))>con.consec  )
      left outer join appointment ap on(oda.office_id = ap.office_id and oda.start_time<= ap.probable_start_time and oda.end_time>= ap.probable_start_time
      and ap.appointment_status_id in(1,2) and ap.probable_start_time =DATE_ADD(oda.start_time, INTERVAL con.consec*o.time_slot_per_client_in_min MINUTE) )
      WHERE o.doctor_id = ${req.params.doctor} and DATE_ADD(oda.start_time, INTERVAL con.consec*o.time_slot_per_client_in_min MINUTE)>CURRENT_TIME()
      order by o.doctor_id,o.id,oda.start_time,con.consec`)
      .then(([results, metadata]) => {
        // Results will be an empty array and metadata will contain the number of affected rows.
        res.json(results)
      })
  });

  app.get("/api/specializations/:specialization_id/doctors/offices/availability", function (req, res) {
    db.sequelize.query("SELECT s.id as `id`, s.specialization_name as `name`,"
      + " d.id as `doctor.id`, concat(d.first_name,  '  ',d.last_name) as `doctor.name`,"
      + " o.id as `doctor.office.id`, concat(o.street_address, ' ', o.city, ' ', o.country, ' ' , o.zip) as `doctor.office.address`,"
      + " ap.id as `doctor.office.availability.appointment_id`,"
      + " DAYOFWEEK(oda.start_time) as `doctor.office.availability.week_day_number`,"
      + " DAYNAME(oda.start_time) as `doctor.office.availability.week_day_name`,"
      + " DATE_FORMAT(oda.start_time, '%M %d %Y') as `doctor.office.availability.date`,"
      + " TIME(DATE_ADD(oda.start_time, INTERVAL con.consec*o.time_slot_per_client_in_min MINUTE)) as `doctor.office.availability.timeslot`"
      + " FROM doctor_specialization ds inner join office o on (ds.doctor_id = o.doctor_id)"
      + " inner join specialization s on (ds.specialization_id = s.id)"
      + " inner join doctor d on (ds.doctor_id=d.id)"
      + " inner join office_doctor_availability oda on(o.id=oda.office_id  )"
      + " inner join consec con on((TIME_TO_SEC(TIMEDIFF(oda.end_time, oda.start_time))/(60*o.time_slot_per_client_in_min))>con.consec  )"
      + " left outer join appointment ap on(oda.office_id = ap.office_id and oda.start_time<= ap.probable_start_time "
      + " and oda.end_time>= ap.probable_start_time and ap.appointment_status_id in(1,2)"
      + " and ap.probable_start_time =DATE_ADD(oda.start_time, INTERVAL con.consec*o.time_slot_per_client_in_min MINUTE) )"
      + " WHERE ds.specialization_id = " + req.params.specialization_id + " and DATE_ADD(oda.start_time, INTERVAL con.consec*o.time_slot_per_client_in_min MINUTE)>CURRENT_TIME()"
      + " order by s.id,o.doctor_id,o.id,DAYOFWEEK(oda.start_time),oda.start_time,con.consec")
      .then(([results, metadata]) => {
        var resultlen = results.length;
        var idspeAnt = null;
        var iddoctorAnt = null;
        var idofficeAnt = null;
        var weekdaynumberAnt = null;
        var jsonresp = "[";
        var idspeUnion = "";
        var iddoctorUnion = "";
        var idofficeUnion = "";
        var idofficeUnionUnion = "";
        var idappUnion = "";
        for (var index = 0; resultlen > index; index++) {
          var rowresult = results[index];
          var idspe = rowresult['id'];
          var namespe = rowresult['name'];
          var iddoctor = rowresult['doctor.id'];
          var namedoctor = rowresult['doctor.name'];
          var idoffice = rowresult['doctor.office.id'];
          var weekdaynumber = rowresult['doctor.office.availability.week_day_number'];
          var weekdayname = rowresult['doctor.office.availability.week_day_name'];
          var date = rowresult['doctor.office.availability.date'];
          var officeaddress = rowresult['doctor.office.address'];
          var idappoint = rowresult['doctor.office.availability.appointment_id'];
          var timeslot = rowresult['doctor.office.availability.timeslot'];
          console.log(moment(timeslot).format("HH:mm"))
          if (idspeAnt != idspe) {
            jsonresp = jsonresp + idspeUnion + "{";
            idspeUnion = "]}]}]}]},";
            jsonresp = jsonresp + "\"id\":" + idspe + "," + "\"name\":\"" + namespe + "\",\"doctor\":[";
            idspeAnt = idspe;
            iddoctorUnion = "";
            iddoctorAnt = null;
          }
          else {
          }
          if (iddoctorAnt != iddoctor) {
            jsonresp = jsonresp + iddoctorUnion + "{";
            iddoctorUnion = "]}]}]},";
            jsonresp = jsonresp + "\"id\":" + iddoctor + "," + "\"name\":\"" + namedoctor + "\",\"office\":[";
            iddoctorAnt = iddoctor;
            idofficeUnion = "";
            idofficeAnt = null;
          }
          else {
          }
          if (idofficeAnt != idoffice) {

            jsonresp = jsonresp + idofficeUnion + "{";
            idofficeUnion = "]}]},";
            jsonresp = jsonresp + "\"id\":" + idoffice + "," + "\"address\":\"" + officeaddress + "\",\"availability\":[";
            idofficeAnt = idoffice;
            idappUnion = "";
            idofficeUnionUnion="";
            dayoftheweekAnt = null;
            weekdaynumberAnt = null;
          }
          else {
          }
          if (weekdaynumberAnt != weekdaynumber) {

            jsonresp = jsonresp + idofficeUnionUnion + "{";
            idofficeUnionUnion = "]},";
            jsonresp = jsonresp + "\"weekdaynumber\":" + weekdaynumber + "," + "\"weekdayname\":\"" + weekdayname + "\"" + "," + "\"date\":\"" + date + "\",\"availability\":[";
            weekdaynumberAnt = weekdaynumber;
            idappUnion = "";
          }
          else {
          }
          var idappointtxt;
          if (idappoint == null) {
            idappointtxt = 'null';
          }
          else {
            idappointtxt = idappoint;
          }
          jsonresp = jsonresp + idappUnion + "{\"id\":" + idappointtxt + "," + "\"timeslot\":\"" + timeslot + "\"}";
          idappUnion = ",";
          if (resultlen == index + 1) {
            jsonresp = jsonresp + "]";
            jsonresp = jsonresp + "}";
            jsonresp = jsonresp + "]";
            jsonresp = jsonresp + "}";
            jsonresp = jsonresp + "]";
            jsonresp = jsonresp + "}";
            jsonresp = jsonresp + "]";
            jsonresp = jsonresp + "}";
          }
        }
        jsonresp += "]";
        console.log(jsonresp);
        res.end(jsonresp);
      })
  });

  app.post("/appointment_confirmation", function(req, res) {
    // // client data
    // var name =  req.body.name;
    // var lastName = req.body.lastName;
    // var phoneNumber = req.body.phoneNumber;
    // var email = req.body.email;

    // // client creation
    // db.client_account.create({
    //   first_name: name,
    //   last_name: lastName,
    //   contact_number: phoneNumber,
    //   email: email
    // })
    // .then(newClient =>  {
    //   res.json(newClient);
    // })
    
    //appointment data
    var user_account_id = req.body.drName;
    var office_id = req.body.address; 
    // var appointment_date = req.body.date;
    var appointmentDate = req.body.timeslot;
    var appointment_status = req.body.patient; 
    var booking_channel = req.body.specialty;
    console.log(req.body);
    //appointment creation
    db.appointment.create({
      user_account_id: user_account_id, // doctor name
      office_id: office_id, // address
      probable_start_time: appointmentDate, // date
      appointment_status_id: appointment_status, //patient name
      app_booking_channel_id: booking_channel //specialty
    })
    .then(newAppointment => {
      res.render("confirmationok", newAppointment.dataValues)
      console.log(newAppointment.dataValues)
    }).catch(error => {
console.log("ERROR 2")
    })
  });




};
