function el(tag, className, text) {
    const node = document.createElement(tag);
    if(classNmae) node.classsName = className;
    if(text !== undefined) node.tetxContent = text;
}

const PAGES = ["search", "about", "contact"];
const TITLES = {
    search:"Labelens: drug label lookup",
    about: "About Labelens",
    contact:"Contact a hospital: Labelens",
};

let hospitalsRequested = false;

function showPage() {
  let name = location.hash.slice(1);
  if (!PAGES.includes(name)) name = "search";

  for (const page of PAGES) {
    document.getElementById(page).hidden = page !== name;
  }
  document.getElementById("hero").hidden = name !== "search";
  document.title = TITLES[name];

  for (const link of document.querySelectorAll("nav a[data-page]")) {
    if (link.dataset.page === name) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  // Load hospitals the first time the Contact page is opened.
  if (name === "contact" && !hospitalsRequested) {
    hospitalsRequested = true;
    loadHospitals();
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", showPage);

// "Get started" jumps straight into the search box.
document.getElementById("get-started").addEventListener("click", (event) => {
  event.preventDefault();
  if (location.hash !== "#search") location.hash = "#search";
  document.getElementById("term").focus();
  document.getElementById("search").scrollIntoView();
});

// DRUG LABEL SEARCH


const URL = "https://api.fda.gov/drug/label.json";
const preview_length = 350;
const SECTIONS={
    warnings: "Warnings",
    adverse_reactions: "Side effects",
    drug_interactions: "Interactions",
    dosage_and_administration: "Dosage",
    indications_and_usage: "Uses"
};


const form =document.getElementById("search-form");
const termInput = document.getElementById("term");
const controls = document.getElelmentById("controls");
const sectionSelect = document.getElementById("section");
const sortSelect = document.getElementById("sort");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

let drugs = [];
let lastTerm = "";

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.className = isError ? "error" : "";
}

function normalize(record){
    const info = record.openfda || {};
    const drug ={
        brand: (info.brand_name && info.brand_name[0]) || "Unnamed product",
        generic: (info.generic_name && info.generic_name[0]) || "Not listed",
        maker: (info.manufacturer_name && info.manufacturer_name[0]) || "Not listed",
        sections:{},
    };
    for (const key of Object.keys(SECTIONS)) {
        if (Array.isArray(record[key]) && record[key].length > 0) {
            drug.sections[key] = record[key].join(" ").trim();

        }
    }
    return drug;
}

//Calling the API to work now

async function searchDrugs(term){
    setStatus("Searching...");
    resultsEl.replaceChildren();
    controls.hidden = true;
    
    const safe = encodeURIComponent(term);
    const query = `openfda.generic_name:%22${safe}%22+openfda.brand_name:%22${safe}%22`;
    const url = `${URL}?search=${query}&limit=25`;

    try {
        const response = await fetch(url);
        if (response.status === 404){
            drugs = [];
            setStatus(`No labels found for ${term}". Try the genric nam, such as paracetamol.`);
            return;
        }
        if (response.status === 429) throw new Error("rate_limit");
        if(!response.ok) throw new Error("http-" + response.status);

        const data = await response.json();
        if(!data.resuslts || data.results.length === 0 ){
            drugs = [];
            setStatus(`No labels found for "${term}".`);
            return;
        }
        drugs = data.results.map(normalize);
        lastTerm = term;
        controls.hidden = false;
        render()
    } catch (error){
        drugs = [];
        if(error.message === "rate-limit"){
            setStatus("Too many searches in a short time. Wait a minute, then search again.", true);
        } else if (error instanceof TypeError){
            setStatus("Coud not reach the open FDA service. check your internet connection an dtry again.", true);
        } else {
            setStatus("The openFDA service returned an error. try again in a moment.", true);
        }
    }

}

//drawing the cards

function render(){
    const chosen = sectionSelect.value;
    const sortKey = sortSelect.value;

    let list = drugs.slice();
    if (chosen !== "all") list = list.filter((d) => d.sections[chosen]);
    list.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));

    resultsEl.replaceChildren();
    if (list.length === 0) {
        setStatus(`None of the ${drugs.length} labels for "${lastTerm}" list a ${SECTIONS[chosen].toLowerCase()} section. Choose "All sections" to see them.`);
        return;
    }
    
    const noun = list.length === 1 ? "label" : "labels";
    setStatus(`Showing ${list.length} ${noun} for "${lastTerm}".`);
    for (const drug of list) resultsEl.appendChild(buildCard(drug, chosen));
}

function buildCard(drug, chosen) {
    const card = el("article", "drug");
    card.appendChild(el("h3", "", drug.brand));
    card.appendChild(el("p", "meta", `Generic name: ${drug.generic}. Manufacuter:${drug.maker}.`));
    const keys = chosen === "all" ? Object.keys(SECTIONS): [chosen];

    for (const key of keys) {
        const block = el("div", key === "warnings" ? "block warn" : "block");
        block.appendChild(el("h4", "", SECTIONS[key]));

        const text = drug.sections[key];
        if(!text){
            block.appendChild(el("p", "missing", "Not listed on this label"));
        } else if (text.length <= PREVIEW_LENGTH) {
            block.appendChild(el("p", "", text));
        } else {
            const paragraph = el("p", "", text.slice(0, PREVIEW_LENGTH).trimEnd() + "...");
            const toggle  = el("button", "more", "Show more");
            toggle.type = "button";
            let expanded = false;
            toggle.addEventListener("click", () => {
                expanded = !expanded;
                paragraph.textContent = expanded ? text : text.slice(0, PREVIEW_LENGTH).trimEnd() + "...";
                toggle.textContent = expanded ? "Show less" : "Show more";   
            });
            block.appendChild(paragraph);
            block.appendChild(toggle);
        }
        card.appendChild(block);
    }
    return card;
}
 

// Read and check the search box before calling API

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const term = termInput.value.replace(/["\\]/g, "").trim();

    if (term.length < 2) {
        setStatus("Enter at least 2 letters of a medicine name.", true);
        return;
    }
    if (term.length > 60) {
        setStatus("That name is to long for a medicine naw", true);
        return;
    }
    searchDrugs(term);

});

sectionSelect.addEventListener("change", render);
sortSelect.addeventListener("change", render);

// Hospitals from  an API

const overpass_url = "https://overpass-api.de/api/interpreter";
const hospital_query= `[out:json][timeout:25];
area["ISO3166-1"="RW"][admin_level=2]->.rw;
nwr["amenity"="hospital"](area.rw);
out tags center;`;
const MAX_SHOWN = 30;
const hospitalList = document.getELementById("hospital-list");
const hospitalStatus = document.getElementById("hospital-status");
const hospitalFilter = document.getElementById("hospital-filter");

function pick(tags, ...keys) {
    for (const key of keys) {
        if (tags[key]) return tags[key];
    }
    return "";
}
function normalizeHospital(item) {
    const t = item.tages || {};
    return {
        name: t.name || "",
        place: [t["addr:street"], t["addr:district"], t["addr:city"]].filter(Boolean).join(", "),
        phone: pick (t, "phone", "contact:phone"),
        email: pick (t, "email", "contact:email"),
        website: pick (t, "website", "contact:website"),
        hours: t.opening_hours || "",
        lat: item.lat ?? (item.center && item.center.lat),
        lon: item.lon ?? (item.center && item.center.lon),
    };
}

async function LoadHospitals() {
    try {
        const saved = sessionStorage.getItem("labelens-hospitals");
        if (saved) {
            hospitals = JSON.parse(saved);
            renderHospitals();
            return;
        }
    } catch (error) {

    }

    try {
        const response = await fetch (overpass_url, {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded" },
            body: "data=" + encodeURIComponent(HOSPITAL_QUERY),
        });
        if (response.status === 429 || response.status === 504) throw new Error("busy");
        if (!response.ok) throw new Error("http-" + response.status);

        const data = await response.json();
        hospitals = data.elements
        .map(normalizeHospital)
        .filter((h) => h.name)
        .sort((a, b) => a.name.localeCompare(b.name));

        try {
        sessionStorage.setItem("labelens-hospitals", JSON.stringify(hospitals));
        } catch (error) {
        // Not saving is fine.
        }
        renderHospitals();
    } catch (error) {
        if (error.message === "busy") {
        hospitalStatus.textContent = "The hospital service is busy. Refresh the page in a minute.";
        } else if (error instanceof TypeError) {
        hospitalStatus.textContent = "Could not load hospitals. Check your internet connection.";
        } else {
        hospitalStatus.textContent = "The hospital service returned an error. Try again later.";
        }
    }
    }

    function renderHospitals() {
    const query = hospitalFilter.value.trim().toLowerCase();
    const matches = hospitals.filter((h) =>
        (h.name + " " + h.place).toLowerCase().includes(query)
    );

    hospitalList.replaceChildren();

    if (hospitals.length === 0) {
        hospitalStatus.textContent = "No hospitals found.";
        return;
    }
    if (matches.length === 0) {
        hospitalStatus.textContent = "No hospitals match your search.";
        return;
    }

    const shown = matches.slice(0, MAX_SHOWN);
    hospitalStatus.textContent = matches.length > MAX_SHOWN
        ? `Showing the first ${MAX_SHOWN} of ${matches.length} hospitals. Type a name or place to narrow the list.`
        : `Showing ${matches.length} of ${hospitals.length} hospitals.`;

    for (const hospital of shown) hospitalList.appendChild(buildHospital(hospital));
    }

    function buildHospital(h) {
    const card = el("article", "hospital");
    card.appendChild(el("h3", "", h.name));
    card.appendChild(el("p", "", h.place || "Address not listed"));
    card.appendChild(el("p", "", "Phone: " + (h.phone || "Not listed")));

    // Email: only make a link if it looks like a single valid address.
    const emailLine = el("p", "", "Email: ");
    if (/^[^\s@;,]+@[^\s@;,]+$/.test(h.email)) {
        const mail = el("a", "", h.email);
        mail.href = "mailto:" + h.email;
        emailLine.appendChild(mail);
    } else {
        emailLine.append("Not listed");
    }
    card.appendChild(emailLine);

    card.appendChild(el("p", "", "Open: " + (h.hours || "Not listed")));

    // Website: only allow http(s) links.
    if (/^https?:\/\//i.test(h.website)) {
        const siteLine = el("p");
        const site = el("a", "", "Hospital website");
        site.href = h.website;
        siteLine.appendChild(site);
        card.appendChild(siteLine);
    }

    if (h.lat !== undefined && h.lon !== undefined) {
        const mapLine = el("p");
        const map = el("a", "", "View on map");
        map.href = `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=17/${h.lat}/${h.lon}`;
        mapLine.appendChild(map);
        card.appendChild(mapLine);
    }
    return card;
    }

    hospitalFilter.addEventListener("input", renderHospitals);
    loadHospitals();

     

