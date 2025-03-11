// This file mostly has database utility functions and exports them to get other files communicate with the database

// Database Structure:
// 'users' table - contains all users and sign in information
// 'plants' table - contains all of the plants made by different users and info such as notes, diseases detected, etc. Has a foreign key relation with users, showing which plants belong to which user
// 'scans' table - contains all of the scans as history (not yet implemented)
// 'sensor_data' table - updated with sensor information from arduino such as mositure, NPK, and PH levels of soil.
// 'disease_tips' table - care tips for all disease classes that can be detected by machine learning model

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"; // import supabase client

// get Supabase URL and Key from the Flask server (for security reasons, this is not hardcoded in the clientside)
async function getSupabaseKeys() {
  console.log("In progress .. keys")
  const response = await fetch("https://plant-disease-server.onrender.com/get-keys"); // fetch Supabase keys from server api endpoint
  console.log("Recieved keys")
  return response.json(); // return the response as JSON
}

const { supabase_url: supabaseUrl, supabase_key: supabaseKey } = await getSupabaseKeys(); // get Supabase URL and Key
export const supabase = createClient(supabaseUrl, supabaseKey); // create Supabase client
export const user = await supabase.auth.getUser();  // get logged in user

// verifies loggedin user with session
export function checkUser() {
  if (user.error != null) {
    window.location.href = "index.html"; // redirect to login page if user is not logged in
  }
}

// Function to sign up a new user with email and password
export async function signUpWithEmail(email, password) {
  try {
    const { user, error } = await supabase.auth.signUp({ // sign up user with email and password
      email,
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: `Sign-up successful! A confirmation email has been sent to ${email}.`, // success message, sending confirmation email
    };
  } catch (err) {
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    };
  }
}

// sign in an existing user with email and password
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email,
    password,
  });

  if (error) {
    console.error("Error signing in:", error.message);
    return { success: false, message: error.message };
  } else {
    console.log("User signed in:", data);
    return { success: true, message: "Login successful!" };
  }
}

// Function to sign out the current user
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("Error signing out:", error.message);
  } else {
    window.location.href = "index.html"; // sign out the user and redirect back to the login page
  }
}

// checking if the entered email already exists in the Supabase database
export async function checkIfEmailExistsInDatabase(email) {
  const { data, error } = await supabase
    .from("users") // querying the table 'users', which contains list of all users.
    .select("email")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Error checking email:", error.message);
    return false;
  }

  return data ? true : false;
}

// function to add a new user signing up to the users table in the database
export async function addUserToDatabase(email, password) {
  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password }]); // inserts the email and password of user (id and timestamp are auto generated)

  if (error) {
    console.error("Error adding user to database:", error.message);
    return { success: false, message: "Failed to create user in database" };
  }

  return {
    success: true,
    message: `User successfully signed up! Confirmation email sent at ${email}`,
  };
}

// gets the plants of a specific user
export async function fetchUserPlants() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(); // gets the current user

  const { data: userdata, error: userError } = await supabase
    .from("users")
    .select()
    .eq("email", user.email)
    .single(); // gets the user's information

  const userId = userdata.id; // variable holding the id of the current user

  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select()
    .eq("user_id", userId); // getting all plants that have a foreign key relation with the given user ID

  return plants;
}

// getting the current user ID (to be used in other files with no access to supabase client)
export async function getUserId() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(); // getting the current logged in user

  const { data: userdata, error: userError } = await supabase
    .from("users")
    .select()
    .eq("email", user.email)
    .single();

  const userId = userdata.id;
  return userId; // returning user ID
}

// adding a new plant to the database, takes in all plant details as parameter
export async function addPlant(plant) {
  const { error } = await supabase.from("plants").insert([plant]); // inserting plant object into plants table

  if (error) {
    return error;
  }

  return null;
}

// deleting a plant from the database, takes in the id of the plant to be deleted
export async function deletePlant(id) {
  const confirmed = confirm("Are you sure you want to delete this plant?");

  if (!confirmed) return;

  const { data, error } = await supabase.from("plants").delete().eq("id", id); // utility supabase function

  if (error) {
    return error;
  } else {
    return null;
  }
}

// getting care tips for a selected disease
export async function getDiseaseTips(className) {
  if (className === "Healthy") {
    return ["Your plant is healthy! Keep up the good care!"]; // complimenting the user if plant is healthy
  }

  const { data, error } = await supabase
    .from("disease_tips")
    .select("care_tips")
    .eq("disease_name", className); // getting the disease tips from database

  const careTipsArray = data[0].care_tips.split(", "); // splitting each care tip by the comma to get an array of tips
  return careTipsArray;
}

// updating a plant details after the user updates it from the plant modal
// takes in the plant id, the name of the plant, and the notes about the plant
export async function updatePlantDetails(plantId, name, notes) {
  const { data, error } = await supabase
    .from("plants")
    .update({ name, notes }) // just replaces the details with the new updated parameters
    .eq("id", plantId);
}

// function used by the frontend when they recieve arduino sensor data from the flask server to save to the database
export async function sendData( // parameters for all sensor variables
  user_id,
  datetime,
  nitrogen,
  phosphorus,
  potassium,
  soilMoisture,
  temperature,
  humidity,
  ph
) {
  // making new data object to add to database
  const data = {
    user_id: user_id,
    datetime: datetime,
    nitrogen: nitrogen,
    phosphorus: phosphorus,
    potassium: potassium,
    soil_moisture: soilMoisture,
    temperature: temperature,
    humidity: humidity,
    ph: ph,
  };

  const { data: insertedData, error } = await supabase
    .from("sensor_data")
    .insert([data]); // inserts data object

  if (error) {
    console.error("Error inserting data:", error);
    return;
  }
}

// gets all of the arduino sensor data for a specific user
export async function fetchData(user_id) {
  const { data, error } = await supabase
    .from("sensor_data")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }
  return data;
}