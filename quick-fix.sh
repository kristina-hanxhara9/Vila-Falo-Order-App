#!/bin/bash

echo "🔧 Vila Falo - Quick Fix Script"
echo "================================"

echo "1️⃣ Checking your Heroku apps..."
heroku apps

echo ""
echo "2️⃣ Please enter your app name from the list above:"
read -p "App name: " app_name

if [ -z "$app_name" ]; then
    echo "❌ No app name provided. Exiting."
    exit 1
fi

echo ""
echo "3️⃣ Checking current config..."
heroku config -a $app_name

echo ""
echo "🔍 I can see MONGODB_URI is empty - this is why your app isn't working!"
echo ""
echo "4️⃣ Please provide your MongoDB connection string:"
echo "   (It should look like: mongodb+srv://username:password@cluster.mongodb.net/dbname)"
read -p "MongoDB URI: " mongodb_uri

if [ -z "$mongodb_uri" ]; then
    echo "❌ No MongoDB URI provided. Exiting."
    exit 1
fi

echo ""
echo "5️⃣ Setting MongoDB URI..."
heroku config:set MONGODB_URI="$mongodb_uri" -a $app_name

echo ""
echo "6️⃣ Checking app logs to see if it's working..."
heroku logs --tail -a $app_name
