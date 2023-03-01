{
	"translatorID": "ceace65b-4daf-4200-a617-a6bf24c75607",
	"label": "Library Catalog (COBISS)",
	"creator": "Brendan O'Connell",
	"target": "^https?://plus\\.cobiss\\.net/cobiss",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-01 15:34:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Brendan O'Connell

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	// TODO: move this hash outside of detectWeb
	// TODO: waiting to hear from Abe if this section makes any sense.

	// Declare a new hashmap object
	var iconMap = [
			'book',               // icon-1
			'journalArticle',     // icon-2
			'newspaperArticle',   // icon-3
			'audioRecording',     // icon-4
			'film',               // icon-5
			'book',               // icon-6 (keyboard)
			'map',                // icon-7
			'audioRecording',     // icon-8 (sheet music)
			'book',               // icon-9 (email icon)
			'book',               // icon-10 (toy)
			'book',               // icon-11 (graduation cap)
			'book',               // icon-12 (camera)
			'book',               // icon-13 (@ symbol)
			'videoRecording',     // icon-14
			'audioRecording',     // icon-15
			'film',               // icon-16
			'book',               // icon-17 (set of books)
			'book',               // icon-18 (globe)
			'book',               // icon-19 (magazine?)
			'artwork',            // icon-20 (pictorial material)
			'audioRecording',     // icon-21 (record player)
			'audioRecording',     // icon-22 (microphone)
			'book',               // icon-23 (fountain pen)
			'book',               // icon-24 (prize medal)
			'videoRecording',     // icon-25 (DVD with small music icon)
			'videoRecording',     // icon-26 (Blu-ray)
			'book',               // icon-27 (e-book)
			'book',               // icon-28 (audiobook)
			'videoRecording',     // icon-29 (e-video)
			'book',               // icon-30 (work performed)
			'book',               // icon-31 (data)
			'newspaperArticle'    // icon-32 (e-newspaper)
	];

	// single items end in an id number that is 8 digits or more
	const itemIDURL = /\d{8,}/

	if (url.match(itemIDURL)) {
		var iconCSSSelector = doc.querySelector('li.in > span').firstElementChild.className;
		var iconNumber = Number(iconCSSSelector.match(/(\d+)/)[0]);
	}

	if (iconCSSSelector) {
		return iconMap[iconNumber];
	}

	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[class="title value"]');

	for (let row of rows) {
		let href = row.href;
		let title = row.innerText;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function constructRISURL(url) {
	// catalog page URL: https://plus.cobiss.net/cobiss/si/sl/bib/107937536
	// RIS URL: https://plus.cobiss.net/cobiss/si/sl/bib/92020483

	// capture first part of URL, e.g. https://plus.cobiss.net/cobiss/si/sl/bib/
	const firstRegex = /^(.*?)\/bib\//
	let firstUrl = url.match(firstRegex)[0];

	// captures item ID, e.g. /92020483
	const secondRegex = /\/([^/]+)$/
	let secondUrl = url.match(secondRegex)[0];

	// outputs RIS structure, e.g. https://plus.cobiss.net/cobiss/si/sl/bib/risCit/107937536
	let risURL = firstUrl + "risCit" + secondUrl;
	return risURL;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {

	const risURL = constructRISURL(url);
	const risText = await requestText(risURL);
	const fixedRisText = risText.replace(/^OK##/, '');
	if (doc.getElementById("unpaywall-link")) {
		var pdfLink = doc.getElementById("unpaywall-link").href;
	}
	const translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(fixedRisText);
	translator.setHandler('itemDone', (_obj, item) => {

		if (pdfLink) {
			item.attachments.push({
	 		url: pdfLink,
	 		title: 'Full Text PDF',
	 		mimeType: 'application/pdf'
		 	});
		 }
		item.url = url;

		// TODO: if there's a link in the catalog record, save it as the snapshot, e.g. https://plus.cobiss.net/cobiss/si/sl/bib/91668227
		// has a link to full text

		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});

		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/92020483",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Nauk o barvah po Goetheju. DVD 2/3, Poglobitev vsebine nauka o barvah, še posebej poglavja \"Fizične barve\" s prikazom eksperimentov",
				"creators": [
					{
						"lastName": "Kühl",
						"firstName": "Johannes",
						"creatorType": "director"
					}
				],
				"date": "2022",
				"ISBN": "9789619527542",
				"libraryCatalog": "Library Catalog (COBISS)",
				"place": "Hvaletinci",
				"studio": "NID Sapientia",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/92020483",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Dialogi v slov. in nem. s konsekutivnim prevodom v slov.</p>"
					},
					{
						"note": "<p>Tisk po naročilu</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/search?q=*&db=cobib&mat=allmaterials&cof=0_105b-p&pdfrom=01.01.2023",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/115256576",
		"items": [
			{
				"itemType": "book",
				"title": "Angel z zahodnega okna",
				"creators": [
					{
						"lastName": "Meyrink",
						"firstName": "Gustav",
						"creatorType": "author"
					}
				],
				"date": "2001",
				"ISBN": "9789616400107",
				"libraryCatalog": "Library Catalog (COBISS)",
				"numPages": "2 zv. (216; 203 )",
				"place": "Ljubljana",
				"publisher": "Založniški atelje Blodnjak",
				"series": "Zbirka Blodnjak",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/115256576",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Prevod dela: Der Engel vom westlichen Fenster</p>"
					},
					{
						"note": "<p>Gustav Meyrink / Herman Hesse: str. 198-200</p>"
					},
					{
						"note": "<p>Magični stekleni vrtovi judovske kulture / Jorge Luis Borges: str. 201-203</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/139084803",
		"items": [
			{
				"itemType": "webpage",
				"title": "Poročilo analiz vzorcev odpadnih vod na vsebnost prepovedanih in dovoljenih drog na področju centralne čistilne naprave Kranj (2022)",
				"creators": [
					{
						"lastName": "Heath",
						"firstName": "Ester",
						"creatorType": "author"
					},
					{
						"lastName": "Verovšek",
						"firstName": "Taja",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/139084803",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dovoljene droge"
					},
					{
						"tag": "nedovoljene droge"
					},
					{
						"tag": "odpadne vode"
					},
					{
						"tag": "čistilna naprava"
					}
				],
				"notes": [
					{
						"note": "<p>Nasl. z nasl. zaslona</p>"
					},
					{
						"note": "<p>Opis vira z dne 11. 1. 2023</p>"
					},
					{
						"note": "<p>Bibliografija: str. 13</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/84534787",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Flood legislation and land policy framework of EU and non-EU countries in Southern Europe",
				"creators": [
					{
						"lastName": "Kapović-Solomun",
						"firstName": "Marijana",
						"creatorType": "author"
					},
					{
						"lastName": "Ferreira",
						"firstName": "Carla S.S.",
						"creatorType": "author"
					},
					{
						"lastName": "Zupanc",
						"firstName": "Vesna",
						"creatorType": "author"
					},
					{
						"lastName": "Ristić",
						"firstName": "Ratko",
						"creatorType": "author"
					},
					{
						"lastName": "Drobnjak",
						"firstName": "Aleksandar",
						"creatorType": "author"
					},
					{
						"lastName": "Kalantari",
						"firstName": "Zahra",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "2049-1948",
				"issue": "1",
				"journalAbbreviation": "WIREs",
				"libraryCatalog": "Library Catalog (COBISS)",
				"pages": "1-14",
				"publicationTitle": "WIREs",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/84534787",
				"volume": "9",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "EU legislation"
					},
					{
						"tag": "Južna Evropa"
					},
					{
						"tag": "Southern Europe"
					},
					{
						"tag": "floods"
					},
					{
						"tag": "land governance"
					},
					{
						"tag": "policy framework"
					},
					{
						"tag": "politika"
					},
					{
						"tag": "poplave"
					},
					{
						"tag": "upravljanje zemljišč"
					},
					{
						"tag": "zakonodaja EU"
					}
				],
				"notes": [
					{
						"note": "<p>Nasl. z nasl. zaslona</p>"
					},
					{
						"note": "<p>Opis vira z dne 11. 11. 2021</p>"
					},
					{
						"note": "<p>Bibliografija: str. 12-14</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
