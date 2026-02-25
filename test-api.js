/**
 * =====================================
 * TEST SCRIPT FOR GOOGLE SHEETS API
 * =====================================
 * 
 * Use this script to test if your Google Apps Script deployment is working correctly.
 * 
 * HOW TO USE:
 * 1. Open your browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run it to test the API connection
 */

// Test configuration
const TEST_CONFIG = {
  apiUrl: "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE", // Replace with your deployment URL
  testTripId: "TEST_" + Date.now(),
};

async function testGoogleSheetsAPI() {
  console.log("🧪 Starting Google Sheets API Test...");
  console.log("API URL:", TEST_CONFIG.apiUrl);
  
  // Test 1: GET request (Fetch trips)
  console.log("\n📥 Test 1: Fetching trips...");
  try {
    const response = await fetch(
      `${TEST_CONFIG.apiUrl}?action=getTrips`,
      { method: "GET" }
    );
    
    const data = await response.json();
    console.log("✅ Fetch trips successful!");
    console.log("Response:", data);
    console.log(`Found ${data.length || 0} trips`);
  } catch (error) {
    console.error("❌ Fetch trips failed:", error);
  }
  
  // Test 2: POST request (Create trip)
  console.log("\n➕ Test 2: Creating test trip...");
  try {
    const testTrip = {
      "S.No.": 9999,
      "Trip Creation Date": new Date().toLocaleDateString('en-GB'),
      "Trip Completion Date": "",
      "Trip Id": TEST_CONFIG.testTripId,
      "Vehicle No.": "TEST-01-XX-1234",
      "Asset Tracker": "TEST-TRACKER",
      "Source Address": "Test Source",
      "Destination Address": "Test Destination",
      "Transporter Name": "Test Transporter",
      "Trip status": "Awaiting to Departure",
      "Packet Status": "Test",
      "Pickup Status": "",
      "Pick-up Raised On": "",
      "Task ID": "TEST123",
      "Zoho Ticket ID": "",
      "Actual Pick-up Date": "",
      "Delivered Date": "",
      "Remarks": "This is a test trip - can be deleted"
    };
    
    const bodyData = {
      action: "create",
      sheet: "Shahi Reverse Pickup/Trip Details",
      data: testTrip
    };
    
    console.log("Sending data:", bodyData);
    
    const response = await fetch(TEST_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(bodyData)
    });
    
    const result = await response.json();
    console.log("✅ Create trip successful!");
    console.log("Response:", result);
    
    if (result.success) {
      console.log("✅ Trip created in Google Sheets!");
      
      // Test 3: Update the trip
      console.log("\n✏️ Test 3: Updating test trip...");
      try {
        const updateData = {
          action: "update",
          sheet: "Shahi Reverse Pickup/Trip Details",
          idColumn: "Trip Id",
          idValue: TEST_CONFIG.testTripId,
          updates: {
            "Remarks": "Updated via API test - " + new Date().toLocaleTimeString()
          }
        };
        
        const updateResponse = await fetch(TEST_CONFIG.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(updateData)
        });
        
        const updateResult = await updateResponse.json();
        console.log("✅ Update trip successful!");
        console.log("Response:", updateResult);
      } catch (error) {
        console.error("❌ Update trip failed:", error);
      }
      
      // Test 4: Delete the trip
      console.log("\n🗑️ Test 4: Deleting test trip...");
      try {
        const deleteData = {
          action: "delete",
          sheet: "Shahi Reverse Pickup/Trip Details",
          idColumn: "Trip Id",
          idValue: TEST_CONFIG.testTripId
        };
        
        const deleteResponse = await fetch(TEST_CONFIG.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(deleteData)
        });
        
        const deleteResult = await deleteResponse.json();
        console.log("✅ Delete trip successful!");
        console.log("Response:", deleteResult);
      } catch (error) {
        console.error("❌ Delete trip failed:", error);
      }
    } else if (result.error) {
      console.error("❌ Create failed with error:", result.error);
    }
  } catch (error) {
    console.error("❌ Create trip failed:", error);
  }
  
  console.log("\n✅ All tests completed!");
  console.log("\n📋 Summary:");
  console.log("- If all tests passed, your API is working correctly");
  console.log("- If any tests failed, check:");
  console.log("  1. Apps Script deployment URL is correct");
  console.log("  2. Apps Script is deployed with 'Execute as: Me'");
  console.log("  3. Apps Script has 'Who has access: Anyone'");
  console.log("  4. Sheet name matches exactly: 'Shahi Reverse Pickup/Trip Details'");
  console.log("  5. Check Apps Script logs via: https://script.google.com > Executions");
}

// Run the test
testGoogleSheetsAPI();
