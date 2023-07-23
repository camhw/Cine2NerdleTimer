// ==UserScript==
// @name         Cine2Nerdle timer
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Timer for Cine2Nerdle for certain users that lack competitive integrity.
// @author       The only honest Cine2Nerdle player
// @match        https://www.cinenerdle2.app/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cinenerdle2.app
// @updateURL    https://github.com/camhw/Cine2NerdleTimer/raw/main/script.user.js
// @downloadURL  https://github.com/camhw/Cine2NerdleTimer/main/script.user.js
// @grant        none
// ==/UserScript==

const LOCALSTORAGE_KEY_TIMER = 'Cine2NerdleTimer';

(function() {
    'use strict';

    let activePuzzle = undefined;
    let startTime = undefined;
    let endTime = undefined;
    let gameFinished = false;
    let resultsCopied = false;

    const readTimerData = () => {
        let timerData;
        try {
            const timerDataString = window.localStorage.getItem(LOCALSTORAGE_KEY_TIMER);
            timerData = JSON.parse(timerDataString);
        } catch (e) {
            console.error(`Failed to read timer data from localStorage`, e);
        }

        return timerData && typeof timerData === 'object' ? timerData : {};
    };

    const writeTimerData = (timerData) => {
        try {
            const timerDataString = JSON.stringify(timerData);
            window.localStorage.setItem(LOCALSTORAGE_KEY_TIMER, timerDataString);
        } catch (e) {
            console.error(`Failed to write timer data to localStorage`, e);
        }
    };

    const writeTimerKV = (currentPuzzle, keyName, value) => {
        const timerData = readTimerData();
        if (typeof timerData[currentPuzzle] !== 'object') {
            timerData[currentPuzzle] = {};
        }
        timerData[currentPuzzle][keyName] = value;
        writeTimerData(timerData);
    };

    const writeStartTime = (currentPuzzle, startTime) => {
        writeTimerKV(currentPuzzle, 'startTime', startTime);
    };

    const writeEndTime = (currentPuzzle, endTime) => {
        writeTimerKV(currentPuzzle, 'endTime', endTime);
    };

    const initializePuzzle = (currentPuzzle) => {
        activePuzzle = currentPuzzle;

        const timerData = readTimerData();
        startTime = timerData[currentPuzzle]?.startTime || undefined;
        endTime = timerData[currentPuzzle]?.endTime || undefined;

        gameFinished = false;
        resultsCopied = false;
    };

    const msToTimestamp = (ms) => {
        const h = Math.floor(((ms / (1000*60*60)) % 24));
        const m = Math.floor(((ms / (1000*60)) % 60));
        const s = (ms / 1000) % 60;

        // Pad to two digits if necessary
        const mPadded = `${m}`.padStart(2, '0');
        // Round to three decimal places, pad to two digits if necessary (i.e. no decimal)
        const sRounded = Math.round((s + Number.EPSILON) * 1000) / 1000
        const sPadded = `${sRounded}`.padStart(2, '0');
        return `${h}:${mPadded}:${sPadded}`;
    }

    const documentObserver = new MutationObserver((mutations, obs) => {
        // Reset page variables if location changes
        try {
            const currentPuzzleString = window.localStorage.currentPuzzle;
            const currentPuzzle = JSON.parse(currentPuzzleString).currentPuzzle;
            if (currentPuzzle !== activePuzzle) {
                initializePuzzle(currentPuzzle);
            }
        } catch (e) {
            console.info('Failed to read current puzzle from localStorage. Not yet set?', e);
        }
        if (!activePuzzle) {
            return;
        }

        if (!startTime && document.getElementsByClassName('puzzle-id').length) {
            startTime = Date.now();
            writeStartTime(activePuzzle, startTime);

            console.log(`Game started ${startTime}`);
        }
        if (!endTime && document.getElementsByClassName('share-result-container').length) {
            endTime = Date.now();
            writeEndTime(activePuzzle, endTime);

            console.log(`Game finished ${endTime}`);
        }

        const shareResultsContainer = document.getElementsByClassName('share-result-container')[0];
        const shareWithFriendsString = document.getElementsByClassName('share-with-friends-string')[0];
        if (shareResultsContainer && shareWithFriendsString) {
            resultsCopied = false;
        }
        if (startTime && endTime && !resultsCopied && shareResultsContainer && !shareWithFriendsString) {
            // Track resultsCopied as flag to avoid copying on subsequent document mutations
            resultsCopied = true;
            console.log('Results copied');
            let shareString = '';
            const shareStringTextElements = document.getElementsByClassName('share-string-text');
            for (let i = 0; i < shareStringTextElements.length; i++) {
                const e = shareStringTextElements[i];
                if (i === shareStringTextElements.length - 1) {
                    // Insert time as second last entry
                    const elapsedTime = endTime - startTime;
                    shareString += `Time: ${msToTimestamp(elapsedTime)}\n`;
                    shareString += `${e.textContent}`;
                } else {
                    shareString += `${e.textContent}\n`;
                }
            }
            navigator.clipboard.writeText(shareString);
        }
    });

    documentObserver.observe(document, {
        childList: true,
        subtree: true,
    });
})();
