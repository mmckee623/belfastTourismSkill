\rm -fr lambda_upload.zip
zip -r lambda_upload.zip index.js  node_modules  restaurant_db.json  nightlife_db.json
aws lambda update-function-code --function-name belfastTourismSkill --zip-file fileb://lambda_upload.zip
