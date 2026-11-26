# UI_webinfra

Labelens trun slog, technical medicine into short, searchablesections. Type a medicine name and read its official warnings, side effects, interactions, dosage and uses. Th eapp also lists hospitalsin Rwanda to contact for further information, and has a login system.

- **Live site:** https://www.nishimwe.tech/
- **Repository:** https://github.com/Daniella189-hub/UI_webinfra
- **Demo video:** https://youtu.be/lCGQ0K46LdI

> ** For infromation only.Labelens is not medical advice. ** Always ask a doctor or pharmacist before taking, stopping or combining medicines.

---
## The problem it solves

Medicine labels are long and printed in tiny text Many people never read them, so they miss warnings, side effects and interactions that matter. Label finds the official labeland splits it into short sections that can filtered, sorted and searched.

## Features
 **Search** by generic or brand name, using live data from the openFDA Drug Label API
- **Filter** by section: Warnings, Side effects, Interactions, Dosage, Uses
- **Sort** results by brand name or manufacturer
- **"Show more" / "Show less"** on long label text
- **Hospital directory** loaded live from OpenStreetMap, with a filter by name or place
- **Login system** with Firebase Authentication (create account, log in, reset password)
- **About page** covering the problem, how to use the app, data sources, privacy and FAQ
- **Error handling:** friendly messages for no results, rate limits, API downtime and no internet
- **Responsive** dark interface

## Technologies used

- HTML, CSS, JavaScript
- [Node.js/Express, Python/Flask, Django, etc.]
- [Database, if used]
- [Nginx, Apache, Docker, etc.]
- [Testing tools, if used]

## Project structure

```
UI_webinfra/
├── index.html                   Home, search, About and Contact views
├── main.js                      Search, page switching and hospitals
├── login.html                   Login page
├── login.js                     Login logic (Firebase Authentication)
├── style.css                    All styling
├── firebase-config.example.js   Template for the Firebase settings
├── firebase-config.js           Real settings (NOT in the repo, see below)
├── .gitignore
└── README.md
```
## Cloning the repository
```bash
git clone https://github.com/Daniella189-hub/UI_webinfra.git
```
---

## APIs and services used

| Service | Used for | Documentation | Key needed? |
|---|---|---|---|
| **openFDA Drug Label API** | Official medicine labels | https://open.fda.gov/apis/drug/label/ | No key in this project (see rate limits) |
| **OpenStreetMap Overpass API** | Hospitals in Rwanda | https://wiki.openstreetmap.org/wiki/Overpass_API | No |
| **Firebase Authentication** (Google) | Login | https://firebase.google.com/docs/auth/web/start | Yes: project settings, given in the submission comment |

**Rate limits:** openFDA's documentation states limits of 240 requests per minute and 1,000 per day per IP address without a key (higher with a free key). See https://open.fda.gov/apis/authentication/. The app handles an exceeded limit with a friendly message.

**Credits**
- Drug label data: **openFDA**, U.S. Food and Drug Administration
- Hospital data: **© OpenStreetMap contributors**, available under the Open Database License (https://www.openstreetmap.org/copyright), accessed through the Overpass API
- Login: **Firebase Authentication**, Google
- Web server: **Nginx**. Load balancer: **HAProxy**. Certificates: **Let's Encrypt** (Certbot)


---

### Why `firebase-config.js` is not in the repository
The assignment says not to expose keys in the public repo, so the real file is listed in `.gitignore`. The repo includes `firebase-config.example.js` showing the format. Firebase web settings identify the project and are not passwords, but they are kept out of the repo as a precaution.

---

## Architecture and deployment

```
                      Visitor (browser)
                             |
                   https://www.nishimwe.tech
                             |
                    +--------------------+
                    |  Lb01 (HAProxy)    |   port 80 redirects to 443
                    |  SSL termination   |   port 443 with the certificate
                    +--------------------+
                       |             |
             round robin             round robin
                       |             |
              +-------------+  +-------------+
              | 7338-web-01 |  | 7338-web-02 |
              |   Nginx     |  |   Nginx     |
              +-------------+  +-------------+
```

All requests go over HTTPS to the load balancer, which ends the SSL connection and passes the request to either web server.

### 1. Web servers (repeat on 7338-web-01 and 7338-web-02)

Install Nginx and put the project files in the web folder:

```bash
sudo apt update && sudo apt install -y nginx
#  cloning the repo in each of the web servers. So I can easy pull any cahnges
git clone https://github.com/Daniella189-hub/UI_webinfra.git
# moving the folder UI_webinfra in /var/www/html/* so it can server anything in this server
```
<img width="560" height="72" alt="image" src="https://github.com/user-attachments/assets/81015c15-7e12-4f09-b9a3-7a7b430ecd84" />

Nginx site (`/etc/nginx/sites-available/default`). The `X-Served-By` header shows which server answered, and it is set to `7338-web-02` on the second server:

<img width="532" height="51" alt="image" src="https://github.com/user-attachments/assets/3949930d-2ef1-4188-a3b4-e21cf1f225b0" />


Speed settings (`/etc/nginx/snippets/labelens-speed.conf`), described under Optimizations below:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 256;
gzip_comp_level 5;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;

expires 5m;
location ~* \.(css|js)$ {
    expires 10m;
}
```

Check and reload:

```bash
sudo nginx -t
sudo service nginx restart
```

### 2.Load balancer  (Lb01)
A let's  Encrypt certificte was issued for `www.nishimwe.tech`, and the domain's DNS **A record** points to Lb01. HAproxy needs the certificate and key combined in one file (`/etc/haproxy/certs/www.nishimwe.tech.pem).
<img width="934" height="403" alt="image" src="https://github.com/user-attachments/assets/ef95a96d-7bc9-494b-bc3f-2d32a6cf68d9" />


```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo service haproxy restart
```

## Testing the load balancer
**1. HTTP is redirected to HTTPS***

```bash
curl -I http://www.nishimwe.tech/
```

**2.Traffic alternates between both servers.** Six requests through the load balancer were answered by the two servers  in turn, all with status 200:

<img width="894" height="204" alt="Screenshot 2026-11-25 115043" src="https://github.com/user-attachments/assets/82e3d86e-ab37-4247-9ba1-5b34dac96311" />


**3. Direct access to a web server is blocked** (firewall allows port 80 only from the load balancer):

```bash
curl -m 5 -I http://35.176.158.204/
# curl: (28) connection timed out
```

## Optimizations

**Server side (Nginx, on both web servers)**
- **gzip compression:** `main.js` is sent at 4,642 bytes instead of 14,442 bytes (about 68% smaller).
- **Browser caching:** `Cache-Control: max-age=600` (10 minutes) for JS and CSS, and 5 minutes for pages. Short times were chosen on purpose so updates show quickly.
- **Load balancing** with health checks.

**Client side (in the browser)**
- The hospital list is **saved for the browser session**, so it isn't requested again when the Contact page is reopened.
- Hospitals load **only when the Contact view is first opened**, not on every visit.
- Hospital requests try **several public Overpass servers in turn**, with a 12-second timeout each, so one slow or refusing server doesn't break the page.
- Results are built in the page without reloading, so filtering and sorting are instant.

---

## Security

- **HTTPS everywhere:** all HTTP requests are redirected to HTTPS. The certificate is from Let's Encrypt for `www.nishimwe.tech`.
- **No secrets in the repo:** `firebase-config.js` is ignored by git. SSH keys are never committed.
- **Safe display of API data:** text from the APIs is inserted with `textContent` (never as HTML), which prevents cross-site scripting (XSS) from label or hospital data.
- **Input validation:** the search box is limited to 2 to 60 characters and has quotes removed before it is used in a request. Login checks the email format and requires passwords of at least 8 characters.
- **Safe links:** hospital websites are only linked if they start with `http://` or `https://`, and emails only if they look like a single valid address.
- **Login:** handled by Firebase Authentication. Labelens never sees or stores passwords. Error messages don't reveal whether an email has an account (password reset gives one generic answer).
- **Firewall (ufw) on the servers:** SSH is allowed, and port 80 on the web servers accepts connections only from the load balancer. server1: 35.178.184.225, server2: 	35.176.158.204

---

## Challenges and how I solved them

| Challenge | Solution |
|---|---|
| The Overpass hospital server returned **406 (Not Acceptable)** to browser requests | Added fallback logic that tries a GET request and several alternative public Overpass servers in turn, and falls back to a friendly message |
| Opening the load balancer by IP gave **a certificate name error** | The certificate was issued for `www.nishimwe.tech`, not an IP. Pointed the domain's DNS at the load balancer and used the domain name |
| Login showed "not set up" with **`Failed to resolve module specifier "firebase/app"`** | Firebase's sample code uses `npm` style imports, which browsers can't read. Replaced them with imports from Google's CDN and kept the config file to only the settings object |
| A page returned **404 on one server only** | Used the `X-Served-By` header to see which server answered, and found one server was missing a file. Copied the same files to both servers |
| **Keys in a public repo** | Kept `firebase-config.js` out of git, committed a `firebase-config.example.js` template, and gave the real values in the submission comment |
| **Locking myself out** while adding a firewall | Allowed SSH first, tested a second login before closing the first, and only then enabled the firewall |
| Many **small typos** broke the JavaScript (misspelled method names, wrong ids) | Used the browser Console (F12) to read each error and fix it line by line |

## Limitations

- Labels are **United States** labels, so some brand names used in Rwanda may not appear. Searching by generic name works best.
- Hospital contact details come from **OpenStreetMap volunteers**, so phone numbers and opening hours are often missing. Check details before relying on them.
- Labelens shows information only and **cannot give medical advice**.

---

## Author

Marie-Daniella Nishiwe, African Leadership University. Built for the "Playing Around with APIs" assignment.


