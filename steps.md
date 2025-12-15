# 🚀Step-by-Step Execution Guide

This document provides a complete, end-to-end guide to deploy, configure, test, and run AI ServiceFlow from scratch. It is written so that recruiters, collaborators, or future maintainers can reproduce the project reliably.

---

# ✅ Prerequisites

Ensure the following are installed and configured before starting:

* **AWS Account** with admin or sufficient IAM permissions
* **AWS CLI** configured

  ```bash
  aws configure
  ```
* **Git**
* **Python 3.10+** (for Lambda packaging & local testing)
* **Web Browser** (Chrome recommended for voice features)

---

## 📋 Step 1: AWS Infrastructure Setup (15–20 mins)

### 1.1 Create DynamoDB Table

This table stores all generated support tickets.

```bash
aws dynamodb create-table \
  --table-name ServiceFlow-Users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

✔️ Confirm table status is **ACTIVE** in DynamoDB console.

---

### 1.2 Create Cognito User Pool

Used for authentication and session management.

**Create User Pool**

```bash
aws cognito-idp create-user-pool \
  --pool-name ServiceFlow-UserPool \
  --auto-verified-attributes email \
  --region us-east-1
```

📌 Note the generated **UserPoolId** (example: `us-east-1_XXXXXXX`)

**Create App Client**

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_XXXXXXX \
  --client-name ServiceFlow-WebApp \
  --explicit-auth-flows ADMIN_NO_SRP_AUTH \
  --region us-east-1
```

📌 Note the **ClientId** — required in `script.js`.

---

### 1.3 Deploy Lambda Functions

#### A. Knowledge Base Query Lambda

This Lambda handles RAG-based AI responses using Amazon Bedrock.

```bash
aws lambda create-function \
  --function-name AIServiceFlow-KnowledgeBase-Query \
  --zip-file fileb://knowledgebase-query.zip \
  --handler lambda_function.lambda_handler \
  --runtime python3.12 \
  --role arn:aws:iam::YOUR-ACCOUNT-ID:role/lambda-execution-role \
  --region us-east-1
```

**Enable Function URL**

```bash
aws lambda add-permission \
  --function-name AIServiceFlow-KnowledgeBase-Query \
  --statement-id function-url \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE
```

📌 Save the **Function URL**.

---

#### B. Ticket Creator Lambda

* Parses user input
* Detects multi-issue requests
* Assigns category & priority
* Stores tickets in DynamoDB

(Repeat Lambda creation steps with appropriate zip & handler.)

---

#### C. getTickets Lambda + API Gateway

* Fetches tickets from DynamoDB
* Sorts by timestamp (newest first)
* Exposes REST API via API Gateway

📌 Save the **API Gateway endpoint URL**.

---

## 📋 Step 2: Configure Knowledge Base (10 mins)

Set the following **environment variables** in the Knowledge Base Lambda:

```text
KNOWLEDGE_BASE_ID = KQOOGFIEAH
BEDROCK_MODEL_ARN = <Claude 3 Haiku ARN>
AWS_REGION = us-east-1
```

✔️ Verify IAM role has Bedrock and KB access.

---

## 📋 Step 3: Deploy Frontend (5 mins)

### Option A: S3 + CloudFront (Production)

**Create S3 Bucket**

```bash
aws s3 mb s3://aiserviceflow-frontend --region us-east-1
```

**Upload Frontend Files**

```bash
aws s3 sync . s3://aiserviceflow-frontend --delete
```

**Enable Static Website Hosting**

```bash
aws s3 website s3://aiserviceflow-frontend/ --index-document index.html
```

Update `script.js` with:

* Cognito **UserPoolId** & **ClientId**
* Lambda **Function URLs**
* API Gateway **endpoint**

---

### Option B: Local Development

```bash
python -m http.server 8000
```

Open:

```
http://localhost:8000
```

---

## 📋 Step 4: Test Complete Flow (10 mins)

### 4.1 User Registration & Login

* Register new user
* Verify email
* Login successfully

---

### 4.2 Single Ticket Creation

**Input:**

```
My printer won't print and it's making strange noises
```

**Expected:**

* Category: Hardware
* Priority: High
* Ticket Type: Hardware Failure

---

### 4.3 Multi-Ticket Creation

**Input:**

```
1. Computer won't start
2. Can't access email
Also printer jammed
```

**Expected:**

* 3 tickets created
* Hardware / Email / Hardware categories

---

### 4.4 AI Chat Assistant

**Ask:**

```
How do I reset my VPN connection?
```

**Expected:**

* Knowledge base answer
* Citations included

---

### 4.5 Ticket Dashboard

✔️ Tickets visible
✔️ Sorted newest → oldest
✔️ Search & filter working

---

### 4.6 Voice Input

* Click mic icon
* Speak issue
* Text auto-fills
* Ticket creation works

---

### 4.7 Theme Toggle

✔️ Light ↔ Dark mode
✔️ Smooth transition
✔️ Preference persists after refresh

---

## 🔧 Configuration Checklist

| Component       | Status | Configuration             |
| --------------- | ------ | ------------------------- |
| DynamoDB        | ⬜      | `ServiceFlow-Users` table |
| Cognito         | ⬜      | UserPoolId, ClientId      |
| Lambda (KB)     | ⬜      | KnowledgeBase ID          |
| Lambda (Create) | ⬜      | DynamoDB table name       |
| Lambda (Fetch)  | ⬜      | API Gateway               |
| Frontend        | ⬜      | URLs in `script.js`       |
| S3              | ⬜      | Static hosting enabled    |

---

## 🧪 Troubleshooting

* **CORS Error** → Check Lambda response headers
* **No tickets shown** → Verify DynamoDB table name
* **Auth failed** → Check Cognito ClientId
* **AI no response** → Verify KnowledgeBase ID
* **Voice not working** → Use Chrome, check mic permissions

---

## 🎉 Success Indicators

✅ Login works
✅ Single ticket created
✅ Multi-ticket split works
✅ AI chatbot responds
✅ Dashboard updates
✅ Voice input functional
✅ Theme persists

---

🚀 **AI ServiceFlow is now LIVE and production-ready.**
