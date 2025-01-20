import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://dxwtzgtaltpqpkokievh.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4d3R6Z3RhbHRwcXBrb2tpZXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1Nzg1MzUsImV4cCI6MjA1MTE1NDUzNX0.rnQ0Q487d-LeYys8lwe4sCUf6u6m6-KLwwB-5iCTP84";
export const supabase = createClient(supabaseUrl, supabaseKey);
export const user = await supabase.auth.getUser();

// verifies loggedin user with session
export function checkUser() {
  if (user.error != null) {
    window.location.href = "login.html";
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
    window.location.href = "login.html";
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