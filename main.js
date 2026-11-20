const URL = "https://api.fda.gov/drug/label.json";
const preview_length = 350;
const sections={
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
const resultEl = document.getElementById("results");

let drugs = [];
let lastTerm = "";

function normalize(record){
    const info = record.openfda || {};
    const drug ={
        brand: (info.brand_name && info.brand_name[0]) || "unamed product",
        generic: (info.generic_name && info.generic_name[0]) || "Not listed",
        maker: (info.manufacturer_name && info.manufacturer_name[0]) || "Not listed",
        section:{},
    };
    for (const key of Object.keys(SECTIONS)) {
        if (Array.isArray(record[key]) && record[key].length > 0) {
            drug.sections[key] = record[key].join("").trim();

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
    const query = `openfda.generic_name: %22${safe}%22+openfda.brand_name:%22${safe}%22`;
    const url = `${URL}?search=${query}&limit=25`;

    try {
        const resposne = await fetch(url);
        if (response.status === 404){
            drugs = [];
            setStatus(`No labels found for ${term}". Try the genric nam, such as paracetamol.`);
            return;
        }
        if (response.status === 429) throw new Error("rate_limit");
        if(!response.ok) throw new Error("http-" + response.status);

        const data = await response.json();
        if(!data.resuslts || data.resuslts.length === 0 ){
            drugs = [];
            setStatus(`No labels found for "${term}".`);
            return;
        }
        drugs = data.results.map(normalize);
        lastTerm = term;
        controls.hidden = false;
        render()
    }catch (error){
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
    const chosen = selectionSelect.value;
    const sortKey = sortSELECT.value;

    let list = drugs.slice();
    if (chosen !== "all") list = list.filter((d) => d.sections[chosen]);
    resultsEl.replaceChildren();
    if (list.length === 0) {
        setStatus(`None of the ${drugs.length} labels for "${lastTerm}" list a ${SECTIONS[chosen].toLowerCase()} section. Choose "All sections" to see them.`);
        return;
    }
    
    const noun = list.length === 1 ? "label" : "labels";
    setStatus(`Showing ${list.length} ${noun} for "${lastTerm}".`);
    for (const drug of list) resultsEl.appendChild(buildCard(drug, chosen));
}

function buildCard(drug, chosen){
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