// ==UserScript==
// @name         Cine2Nerdle timer
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Timer for Cine2Nerdle for certain users that lack competitive integrity.
// @author       The only honest Cine2Nerdle player
// @match        https://www.cinenerdle2.app/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cinenerdle2.app
// @updateURL    https://github.com/camhw/Cine2NerdleTimer/raw/main/script.user.js
// @downloadURL  https://github.com/camhw/Cine2NerdleTimer/raw/main/script.user.js
// @grant        none
// ==/UserScript==

const LOCALSTORAGE_KEY_TIMER = 'Cine2NerdleTimer';
const SHARE_STRING_TEXT_CLASSNAME = 'share-string-text';

(function() {
    'use strict';

    // Game state
    let activePuzzle = undefined;
    let puzzleLoaded = false;
    let startTime = undefined;
    let endTime = undefined;
    let gameFinished = false;

    // Share results container
    let shareResultsContainerUpdated = false;
    let resultsCopied = false;

    // Footer timer
    const createFooterTimer = () => {
        const timer = document.createElement('H1');
        timer.className = 'black-text footer-timer';
        return timer;
    }
    const footerTimer = createFooterTimer();
    let footerIntervalId = undefined;

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

    const checkPuzzleLoaded = () => {
        return !!document.getElementsByClassName('puzzle-id').length;
    };

    const initializePuzzle = (currentPuzzle) => {
        activePuzzle = currentPuzzle;
        puzzleLoaded = checkPuzzleLoaded();

        const timerData = readTimerData();
        startTime = timerData[currentPuzzle]?.startTime || undefined;
        endTime = timerData[currentPuzzle]?.endTime || undefined;

        gameFinished = false;
        resultsCopied = false;
        shareResultsContainerUpdated = false;

        if (footerIntervalId) {
            clearInterval(footerIntervalId);
        }
        footerIntervalId = undefined;
    };

    const msToTimestamp = (ms, shouldFloorSeconds) => {
        const h = Math.floor(((ms / (1000*60*60)) % 24));

        const m = Math.floor(((ms / (1000*60)) % 60));
        // Pad to two digits if necessary
        const mPadded = `${m}`.padStart(2, '0');

        const sFloat = (ms / 1000) % 60;
        // Round to three decimal places if needed
        const s = shouldFloorSeconds ? Math.floor(sFloat) : (Math.round((sFloat + Number.EPSILON) * 1000) / 1000).toFixed(3);
        // Pad depending on floored or floated seconds
        const sPadded = `${s}`.padStart(shouldFloorSeconds ? 2 : 6, '0');

        return `${h}:${mPadded}:${sPadded}`;
    }

    const updateFooterTimer = () => {
        if (!footerTimer) {
            console.error('Unable to update footer timer; does not exist');
        }
        if (!startTime) {
            console.error('Unable to update footer timer; start time not defined');
        }

        const elapsedTime = endTime ? endTime - startTime : Date.now() - startTime;
        footerTimer.textContent = `TIME: ${msToTimestamp(elapsedTime, !endTime)}`;
    };
    const insertFooterTimer = () => {
        console.log('Inserting footer timer');
        const gridFooter = document.getElementsByClassName('grid-footer')[0];
        if (!footerTimer) {
            // Shouldn't get here, but just in case, recreate footer timer
            footerTimer = createFooterTimer();
        }
        gridFooter.appendChild(footerTimer);

        if (footerIntervalId) {
            clearInterval(footerIntervalId);
            footerIntervalId = undefined;
        }
        updateFooterTimer();
        footerIntervalId = setInterval(updateFooterTimer, 1000);
    };

    const updateShareResultsContainer = () => {
        if (!startTime || !endTime) {
            return;
        }
        shareResultsContainerUpdated = true;

        const elapsedTime = endTime - startTime;
        const timerShareString = document.createElement('div');
        timerShareString.className = SHARE_STRING_TEXT_CLASSNAME;
        timerShareString.textContent = `Time: ${msToTimestamp(elapsedTime)}`;

        const shareStringElement = document.getElementsByClassName('share-string')[0];
        shareStringElement.insertBefore(timerShareString, shareStringElement.lastChild);
    };
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

        if (!puzzleLoaded && checkPuzzleLoaded()) {
            puzzleLoaded = true;
        }
        if (!startTime && puzzleLoaded) {
            startTime = Date.now();
            writeStartTime(activePuzzle, startTime);

            console.log(`Game started ${startTime}`);
        }
        if (startTime && puzzleLoaded && !footerIntervalId) {
            insertFooterTimer();
        }
        if (!endTime && document.getElementsByClassName('share-result-container').length) {
            endTime = Date.now();
            writeEndTime(activePuzzle, endTime);

            console.log(`Game finished ${endTime}`);
        }

        const shareResultsContainer = document.getElementsByClassName('share-result-container')[0];
        const shareWithFriendsString = document.getElementsByClassName('share-with-friends-string')[0];
        if (!shareResultsContainer) {
            shareResultsContainerUpdated = false;
        }
        if (shareResultsContainer && !shareResultsContainerUpdated) {
            updateShareResultsContainer();
        }
        if (shareResultsContainer && shareWithFriendsString) {
            resultsCopied = false;
        }
        if (startTime && endTime && !resultsCopied && shareResultsContainer && !shareWithFriendsString) {
            // Track resultsCopied as flag to avoid copying on subsequent document mutations
            resultsCopied = true;
            console.log('Results copied');
            let shareString = '';
            const shareStringTextElements = document.getElementsByClassName(SHARE_STRING_TEXT_CLASSNAME);
            for (let i = 0; i < shareStringTextElements.length; i++) {
                const e = shareStringTextElements[i];
                if (i === shareStringTextElements.length - 1) {
                    shareString += e.textContent;
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
