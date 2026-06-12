# 🌾 Pest Detection & Information System

This web-based project is a **Pest Detection and Classification System** specifically built for identifying **jute crop pests** using a custom-trained model via [Teachable Machine](https://teachablemachine.withgoogle.com/). The system allows users to upload an image of a pest, classifies it using a trained model, and then automatically fetches relevant information about the predicted pest using **Google Custom Search API**.

---

## 🚀 Features

- ✅ Upload and preview pest image
- ✅ Predict pest type using a trained Teachable Machine model
- ✅ Automatically fetch information about:
  - What the pest attacks
  - Its host plant
  - Methods of control or prevention
- ✅ Clean and mobile-friendly UI
- ✅ Top 3 web results are shown dynamically using Google Programmable Search

---

## 🧠 Technologies Used

- **Teachable Machine (Image Model)**
- **TensorFlow.js**
- **Vanilla JavaScript**
- **Google Custom Search API**
- **CSS3** (for modern UI layout)
- **HTML5**

---

## 📸 Screenshots

| Image | Description |
|-------|-------------|
| ![](Screenshots/Screenshot1.png) | Homepage and Image Upload |
| ![](Screenshots/Screenshot2.png) | Pest Information Fetched from Google |
| ![](Screenshots/Screenshot3.png) | Prediction Result and Confidence |
| ![](Screenshots/Screenshot4.png) | Full Layout (Responsive Design) |

---

## 🔍 How It Works

1. **Upload Image**  
   Users select an image of the pest they wish to identify.

2. **Prediction**  
   The model classifies the image and returns the most probable pest label with a confidence score.

3. **Pest Information**  
   Using Google’s Programmable Search API, the system auto-fetches basic, relevant information about the pest, such as:
   - What crops it affects
   - Its life cycle
   - How to control or prevent it

---

## 🔧 Setup Guide

> Ensure you have a valid Google Programmable Search Engine set to **Search the entire web**, and an API key from Google Cloud Console.

1. Clone or download the project files.
2. Place your exported Teachable Machine model inside the `my_model/` folder.
3. In your JavaScript, replace:
   ```js
   const API_KEY = "YOUR_GOOGLE_API_KEY";
   const CX = "YOUR_CUSTOM_SEARCH_ENGINE_ID";
   ```

4. Open `index.html` in any browser.

---

## 📄 Project Status

✅ Complete and functional as a student project.
📌 Future improvements could include:

* Drawing bounding boxes around detected pests
* Offline model loading
* Support for more pest types and training data

---

## 📚 Acknowledgments

* Google Teachable Machine
* Google Programmable Search Engine
* TensorFlow\.js Team
* Jute Pest image dataset used for model training

---

## 📬 Contact

For collaboration or suggestions, feel free to contact the developer.

- **Email:** tennwhiterose@gmail.com  
- **WhatsApp:** +2348148355580  
- **Twitter:** [@l9z1c0d9](https://x.com/l9z1c0d9), [@ComfyLearn](https://x.com/ComfyLearn), [@SoftBrein](https://x.com/SoftBrein)  
- **Website:** [SoftBrein](https://softbrein.tech/), [ComfyLearn](https://comfylearn.site/), [ComfyLearn Blog](https://blog.comfylearn.site/)  
