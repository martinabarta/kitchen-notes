MANUTENZIONE KITCHEN NOTES

Per aggiungere una nuova ricetta è necessario seguire i seguenti passaggi:

1. CREAZIONE DEL FILE RICETTA
Ogni nuova ricetta deve essere un file di testo salvato con estensione .json dentro la cartella ricette/ (esempio: ricette/lasagne.json)
Il file deve seguire questa struttura:
{
	"id": ,
	"title": "",
	"subtitle": "",
	"category": "",
	"difficulty": "", //Se non specificata, di default è 'Media'
	"baseServings": , //Se non specificata, di default è '4'
	"time": ,
	"prepTime": ,  //Se non specificato, di default è ----
	"cookTime": ,  //Se non specificato, di default è ----
	"ingredients": [
        	{"name": "", "qty": , "unit": "" } //Se si vuole indicare 'q.b.' è necessario scrivere: "qty": "" , "unit": "q.b."
   ],
	"instructions": [
		""
	],
	"notes":[
		""
	],
	"variants": [
	{
		"name": "",
		"ingredients": [
			""
		],
		"description": ""
	}
	],
	"storageFrigo": [
		""
	],
	"storageFreezer": [
		""
	]
}

- id: Deve essere numerico e univoco
- category: Inserire una delle categorie previste dai filtri (Antipasti, Primi piatti, Secondi piatti, ecc.)
- time, prepTime e cookTime: Devono esser specificati in minuti (1 ora = 60, 1 ora e mezza = 90, ecc.)
- notes, vatiants, storage*: Se una ricetta non ha queste caratteristiche, si può lasciare l'array vuoto [] oppure omettere le proprietà (il sistema nasconderà automaticamente i relativi blocchi visivi)

 
2. Aggiornamento del file lista-ricette.json
Dopo aver posizionato il file .json della ricetta nella cartella /ricette, è necessario caricarlo.
Aprire il file lista-ricette.json e aggiungere la nuova riga all'elenco.
