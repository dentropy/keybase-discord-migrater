const sqlite3 = require('sqlite3').verbose();

// Open a database connection
const db = new sqlite3.Database('keybase_export.sqlite');

// Function to perform the SELECT query
const selectFromTable = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM teams_t', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Main function using async/await
const main = async () => {
  try {
    // Perform the SELECT query and store the result in a variable
    const result = await selectFromTable();
    console.log(result); // Use the result as needed
  } catch (error) {
    console.error(error.message);
  } finally {
    // Close the database connection
    db.close();
  }
};

// Call the main function
main();