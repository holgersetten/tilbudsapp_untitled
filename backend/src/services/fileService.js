const fs = require('fs');
const path = require('path');
const config = require('../config');

class FileService {
    constructor() {
        this.offersDir = config.offersDir;
        this.ensureDirectoryExists(this.offersDir);
    }

    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    loadJSON(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(data);
                return parsed;
            }
            console.warn(`⚠️ Fil ikke funnet: ${filePath}`);
            return {};
        } catch (error) {
            console.error(`❌ Feil ved lasting av ${filePath}:`, error.message);
            console.error('❌ Fil innhold kan være korrupt eller ikke gyldig JSON');
            return {};
        }
    }

    saveJSON(filePath, data) {
        try {
            const dir = path.dirname(filePath);
            this.ensureDirectoryExists(dir);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`❌ Feil ved lagring av ${filePath}:`, error.message);
            return false;
        }
    }

    saveIfChanged(filename, newData) {
        const filePath = path.join(this.offersDir, filename);
        const tempPath = filePath + '.tmp';

        try {
            // Sjekk om filen eksisterer og har samme innhold
            if (fs.existsSync(filePath)) {
                const existingData = this.loadJSON(filePath);
                if (JSON.stringify(existingData) === JSON.stringify(newData)) {
                    return false; // Ingen endring
                }
            }

            // Skriv til temp-fil først for atomisk operasjon
            fs.writeFileSync(tempPath, JSON.stringify(newData, null, 2), 'utf8');
            fs.renameSync(tempPath, filePath);
            return true; // Endring lagret
        } catch (error) {
            console.error(`❌ Feil ved lagring av ${filename}:`, error.message);
            // Rydd opp temp-fil ved feil
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            return false;
        }
    }

    getOfferFiles() {
        try {
            return fs.readdirSync(this.offersDir)
                .filter(file => file.endsWith('.json'))
                .map(file => path.join(this.offersDir, file));
        } catch (error) {
            console.error('❌ Feil ved lesing av tilbudsmapper:', error.message);
            return [];
        }
    }

    loadAllOffers() {
        const offers = [];
        const files = this.getOfferFiles();

        for (const file of files) {
            const data = this.loadJSON(file);
            if (Array.isArray(data)) {
                offers.push(...data);
            }
        }

        return offers;
    }
}

module.exports = new FileService();
