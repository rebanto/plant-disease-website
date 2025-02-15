import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

async function getSupabaseKeys() {
  const response = await fetch("http://127.0.0.1:5000/get-keys");
  return response.json();
}

const { supabase_url: supabaseUrl, supabase_key: supabaseKey } =
  await getSupabaseKeys();

export const supabase = createClient(supabaseUrl, supabaseKey);
export const user = await supabase.auth.getUser();

// verifies loggedin user with session
export function checkUser() {
  if (user.error != null) {
    window.location.href = "index.html";
  }
}

// Function to sign up a new user with email and password
export async function signUpWithEmail(email, password) {
  try {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: `Sign-up successful! A confirmation email has been sent to ${email}.`,
    };
  } catch (err) {
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    };
  }
}

// Function to sign in an existing user with email and password
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
    window.location.href = "index.html";
  }
}

export async function checkIfEmailExistsInDatabase(email) {
  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Error checking email:", error.message);
    return false;
  }

  return data ? true : false;
}

export async function addUserToDatabase(email, password) {
  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password }]);

  if (error) {
    console.error("Error adding user to database:", error.message);
    return { success: false, message: "Failed to create user in database" };
  }

  return {
    success: true,
    message: `User successfully signed up! Confirmation email sent at ${email}`,
  };
}

export async function fetchUserPlants() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const { data: userdata, error: userError } = await supabase
    .from("users")
    .select()
    .eq("email", user.email)
    .single();

  const userId = userdata.id;

  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select()
    .eq("user_id", userId);

  return plants;
}

export async function getUserId() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const { data: userdata, error: userError } = await supabase
    .from("users")
    .select()
    .eq("email", user.email)
    .single();

  const userId = userdata.id;
  return userId;
}

export async function addPlant(plant) {
  const { error } = await supabase.from("plants").insert([plant]);

  if (error) {
    return error;
  }

  return null;
}

export async function deletePlant(id) {
  const confirmed = confirm("Are you sure you want to delete this plant?");

  if (!confirmed) return;

  const { data, error } = await supabase.from("plants").delete().eq("id", id);

  if (error) {
    return error;
  } else {
    return null;
  }
}

export async function getDiseaseTips(className) {
  if (className === "Healthy") {
    return ["Your plant is healthy! Keep up the good care!"];
  }

  const { data, error } = await supabase
    .from("disease_tips")
    .select("care_tips")
    .eq("disease_name", className);

  const careTipsArray = data[0].care_tips.split(", ");
  return careTipsArray;
}

export async function updatePlantDetails(plantId, name, notes) {
  const { data, error } = await supabase
    .from("plants")
    .update({ name, notes })
    .eq("id", plantId);
}

export async function sendData(
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
    .insert([data]);

  if (error) {
    console.error("Error inserting data:", error);
    return;
  }
}

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