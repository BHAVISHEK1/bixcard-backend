const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
}

// Construct the absolute path to the service account key file
const serviceAccountPath = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Require the service account key using the path from the environment variable
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const userLinksRef = db.collection('userdata').doc('userlinks');

app.use(cors());
app.use(express.json());

// Fetch all links
app.get('/links', async (req, res) => {
  try {
    const doc = await userLinksRef.get();
    if (!doc.exists) {
      return res.status(404).send('No data found');
    }
    res.status(200).send(doc.data());
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Fetch link by platform
app.get('/links/:platform', async (req, res) => {
  try {
      const platform = req.params.platform.toLowerCase();
      const doc = await userLinksRef.get();
      if (!doc.exists) {
          return res.status(404).send('No data found');
      }
      const socialMediaLinks = doc.data().social_media_links;
      if (!socialMediaLinks[platform]) {
          return res.status(404).send(`Link for platform ${platform} not found`);
      }
      res.status(200).send({ platform, link: socialMediaLinks[platform] });
  } catch (error) {
      res.status(500).send(error.message);
  }
});

// Update link
app.post('/update-link', async (req, res) => {
  try {
      const { platform, link } = req.body;
      await userLinksRef.update({
          [`social_media_links.${platform.toLowerCase()}`]: link
      });
      res.status(200).send('Link updated successfully');
  } catch (error) {
      res.status(500).send(error.message);
  }
});

// Delete link
app.delete('/delete-link/:platform', async (req, res) => {
  try {
      const platform = req.params.platform.toLowerCase();
      const doc = await userLinksRef.get();
      if (!doc.exists) {
          return res.status(404).send('No data found');
      }
      const socialMediaLinks = doc.data().social_media_links;
      if (!socialMediaLinks[platform]) {
          return res.status(404).send(`Link for platform ${platform} not found`);
      }
      await userLinksRef.update({
          [`social_media_links.${platform}`]: admin.firestore.FieldValue.delete()
      });
      res.status(200).send('Link deleted successfully');
  } catch (error) {
      res.status(500).send(error.message);
  }
});

// Add/Update link
app.post('/links', async (req, res) => {
  try {
    const { platform, link } = req.body;
    const doc = await userLinksRef.get();
    if (doc.exists) {
      await userLinksRef.update({
        [`social_media_links.${platform.toLowerCase()}`]: link
      });
    } else {
      await userLinksRef.set({
        social_media_links: {
          [platform.toLowerCase()]: link
        }
      });
    }
    res.status(200).send('Link added/updated successfully');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
