# UI_webinfra

# Labelens: Drug Label Lookup

Labelens turns long, technical medicine labels into short, searchable sections. Type a medicine name and read its official warnings, side effects, interactions, dosage and uses. The app also lists hospitals in Rwanda to contact for further information, and has a login system.

- **Live site:** https://www.nishimwe.tech/
- **Repository:** https://github.com/Daniella189-hub/UI_webinfra
- **Demo video (2 minutes):** [ADD YOUR VIDEO LINK HERE]

> **For information only. Labelens is not medical advice.** Always ask a doctor or pharmacist before taking, stopping or combining medicines.

---

## The problem it solves

Medicine labels are long and printed in tiny text. Many people never read them, so they miss warnings, side effects and interactions that matter. Labelens finds the official label and splits it into short sections that can be filtered, sorted and searched.

## Features

- **Search** by generic or brand name, using live data from the openFDA Drug Label API
- **Filter** by section: Warnings, Side effects, Interactions, Dosage, Uses
- **Sort** results by brand name or manufacturer
- **"Show more" / "Show less"** on long label text
- **Hospital directory** loaded live from OpenStreetMap, with a filter by name or place
- **Login system** with Firebase Authentication (create account, log in, reset password)
- **About page** covering the problem, how to use the app, data sources, privacy and FAQ
- **Error handling:** friendly messages for no results, rate limits, API downtime and no internet
- **Responsive** dark interface

## Pages

| Page | What it does |
|---|---|
| Home / Search (`index.html`) | Hero banner and the medicine search |
| About | Explains the app, the data sources and the FAQ |
| Contact | Hospitals in Rwanda from OpenStreetMap, with a filter |
| Login (`login.html`) | Create an account, log in or reset a password |

The Search, About and Contact views are inside one page. The links switch the view and update the address (`#search`, `#about`, `#contact`).

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

## Run it locally

You need Python 3 (for a small local web server) and a browser. The login page uses JavaScript modules, which only load through a server, so don't open the files by double-clicking.

```bash
git clone https://github.com/Daniella189-hub/UI_webinfra.git
cd UI_webinfra

# Create the settings file for login
cp firebase-config.example.js firebase-config.js
# Open firebase-config.js and replace each PASTE_... value with the
# values given in the submission comment.

python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

- Search works without any key.
- To use the login page, `firebase-config.js` must contain the Firebase settings from the submission comment, and the test account details are in the same comment.

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
# copy the project files to the server (from your own computer)
scp -i <key> index.html main.js login.html login.js style.css firebase-config.js ubuntu@<WEB_IP>:/tmp/
# on the server
sudo cp /tmp/index.html /tmp/main.js /tmp/login.html /tmp/login.js /tmp/style.css /tmp/firebase-config.js /var/www/html/
sudo chmod 644 /var/www/html/*
```

Nginx site (`/etc/nginx/sites-available/default`). The `X-Served-By` header shows which server answered, and it is set to `7338-web-02` on the second server:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html;
    index index.html;

    include snippets/labelens-speed.conf;
    add_header X-Served-By 7338-web-01 always;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

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
sudo systemctl reload nginx
```

### 2. Load balancer (Lb01)

A Let's Encrypt certificate was issued for `www.nishimwe.tech`, and the domain's DNS **A record** points to Lb01. HAProxy needs the certificate and key combined in one file (`/etc/haproxy/certs/www.nishimwe.tech.pem`).

`/etc/haproxy/haproxy.cfg` (relevant parts):

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    maxconn 2048
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend http_front
    bind *:80
    http-request redirect scheme https code 301 unless { ssl_fc }

frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/www.nishimwe.tech.pem
    http-request set-header X-Forwarded-Proto https
    default_backend web_servers

backend web_servers
    balance roundrobin
    server web-01 <WEB01_IP>:80 check
    server web-02 <WEB02_IP>:80 check
```

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg    # check the config
sudo systemctl reload haproxy
```

- **`http_front`** sends every plain HTTP request to HTTPS with a `301` redirect.
- **`https_front`** ends the SSL connection using the certificate and passes the request on.
- **`web_servers`** shares requests between the two servers in turn (`roundrobin`). `check` makes HAProxy test each server and stop sending traffic to one that is down.

---

## Testing the load balancer

**1. HTTP is redirected to HTTPS**

```bash
curl -I http://www.nishimwe.tech/
# HTTP/1.1 301 Moved Permanently
# location: https://www.nishimwe.tech/
```

**2. Traffic alternates between both servers.** Six requests through the load balancer were answered by the two servers in turn, all with status 200:

```
200 4642 bytes  x-served-by: 7338-web-02
200 4642 bytes  x-served-by: 7338-web-01
200 4642 bytes  x-served-by: 7338-web-02
200 4642 bytes  x-served-by: 7338-web-01
200 4642 bytes  x-served-by: 7338-web-02
200 4642 bytes  x-served-by: 7338-web-01
```

**3. Direct access to a web server is blocked** (firewall allows port 80 only from the load balancer):

```bash
curl -m 5 -I http://<WEB02_IP>/
# curl: (28) Connection timed out
```

[ADD SCREENSHOTS HERE: the alternating output and the site open in the browser]

---

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
- **Firewall (ufw) on the servers:** SSH is allowed, and port 80 on the web servers accepts connections only from the load balancer. [UPDATE THIS LINE with exactly which servers you finished.]

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

## Tools and resources

- Nginx, HAProxy, Certbot (Let's Encrypt), Firebase Authentication, and the APIs listed above
- Parts of the code, the deployment steps and this README were prepared with help from an AI assistant (Claude, by Anthropic), and then tested, edited and deployed by me. [CHECK ALU'S RULES ON AI USE AND ADJUST THIS LINE SO IT IS ACCURATE.]

## Author

[YOUR NAME], African Leadership University. Built for the "Playing Around with APIs" assignment.
