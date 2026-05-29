# Analisi della vegetazione mediante indici VV,VH,RVI e RFDI.
Questo codice rappresenta una pipeline modulare e automatizzata per l'elaborazione di serie storiche di immagini radar Sentinel-1, progettata per analizzare la risposta vegetativa di diverse aree di studio (es. vigneti e uliveti).

Il flusso di lavoro è diviso in fasi ben distinte:

1. Raccolta Dati (Data Collection)
Seleziona le immagini radar della costellazione Sentinel-1 (GRD).

Filtra i dati per incrociare solo le tue Aree di Interesse (ROI).

Isola le acquisizioni con polarizzazione doppia (VV e VH), modalità Interferometric Wide (IW) e orbita Ascendente.

2. Riduzione del Rumore (Lee Anti-Speckle Filter)
Applica un filtro spaziale di Lee (con un kernel 3x3, raggio 1) per attenuare l'effetto "sale e pepe" (speckle) tipico delle immagini SAR.

Per eseguire il calcolo in modo matematicamente corretto, il codice converte temporaneamente i valori da decibel (dB) a scala lineare, applica la correzione basata su media e varianza locale, e poi riconverte i risultati in dB.

3. Calcolo degli Indici Radar
Sfruttando le bande filtrate, lo script calcola tre nuove variabili utili per il monitoraggio agricolo/forestale:

RVI (Radar Vegetation Index): per stimare la biomassa e la densità della vegetazione.

RFDI (Radar Forest Degradation Index): un indice di differenza normalizzata per valutare la struttura della chioma.

Rapporto VV/VH: utile per evidenziare variazioni fenologiche stagionali.

4. Arricchimento e Analisi Temporale
Unisce tutte le bande (originali filtrate + indici calcolati) in un'unica immagine arricchita.

Aggiunge metadati temporali (frazione di anno, data esatta) per facilitare l'analisi cronologica.

5. Visualizzazione e Statistiche (Processing)
Il codice itera automaticamente su ogni ROI definita (vigneto e uliveto) e produce:

Sei grafici a dispersione (ScatterChart): mostrano l'andamento nel tempo di VV, VH, VV & VH combinati, RVI, RFDI, e RVI & RFDI combinati.

Statistiche Medie: Calcola e stampa nella console la media spaziale di tutti i pixel per ogni singola data, restituendo una tabella di valori pronti per essere analizzati numericamente.
