/**
 * This script generates a file with random weather measurements.
 * Consumes data/weather_stations.csv
 * 
EXAPMLE:

    Nouakchott;30.8
    JuXi;26.7
    Cuttack;12
    ShaoLa R;11.3
    Man;20.4
    Kota KinabaMe;3.4
    Khomeynī Sh;16
    Petrolina;19.3
    Las TuSan;15.9
    Panshi;24
    ...

 */

import * as fs from 'fs';
import path from "path";
import * as readline from 'readline';
import { once } from 'events';

const MAX_NAME_LEN = 100;
const KEYSET_SIZE = 10000;

interface WeatherStation {
    name: string;
    avgTemp: number;
}

const GAUSSIAN_SAMPLES = 10000;
let gaussianSamples: number[] = [];


async function main(): Promise<void> {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.log("Usage: create_measurements3.sh <number of records to create>");
        process.exit(1);
    }

    let size = 0;
    try {
        size = parseInt(args[0], 10);
    } catch (e) {
        console.log("Invalid value for <number of records to create>");
        console.log("Usage: create_measurements3.sh <number of records to create>");
        process.exit(1);
    }

    const weatherStations = await generateWeatherStations();
    const start = Date.now();


    prebuildGaussianSamples(7.0); // Prebuild Gaussian samples
    let out = fs.createWriteStream(path.resolve(__dirname, '../', 'data', 'measurements.txt'));

    for (let i = 1; i <= size; i++) {
        const station = weatherStations[Math.floor(Math.random() * weatherStations.length)];
        const temp = getRandomGaussian(station.avgTemp);
        const line = `${station.name};${Math.round(temp * 10.0) / 10.0}\n`;

        // Write data and handle backpressure
        if (!out.write(line)) {
            await once(out, 'drain');
        }

        if (i % 10000000 === 0) {
            console.log(`Wrote ${i} measurements in ${Date.now() - start} ms`);
            out.end(); // Close the current stream
            await new Promise(resolve => out.on('close', resolve)); // Wait for the stream to close
            out = fs.createWriteStream(path.resolve(__dirname, '../', 'data', 'measurements.txt'), { flags: 'a' });
        }
    }

    out.end(); // Ensure the stream is closed after the loop
    await new Promise(resolve => out.on('close', resolve)); // Wait for the stream to close


}

function randomGaussian(mean: number, std: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + (Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)) * std;
}

function prebuildGaussianSamples(std: number) {
    for (let i = 0; i < GAUSSIAN_SAMPLES; i++) {
        gaussianSamples.push(randomGaussian(0, std)); // mean is 0 as we will adjust it later
    }
}

function getRandomGaussian(mean: number): number {
    const sample = gaussianSamples[Math.floor(Math.random() * GAUSSIAN_SAMPLES)];
    return sample + mean; // Adjust the sample by the mean
}

async function generateWeatherStations(): Promise<WeatherStation[]> {
    const namesList = await readBigNameFromFile('data/weather_stations.csv');
    const weatherStations: WeatherStation[] = [];
    const names = new Set<string>();

    let minLen = Number.MAX_VALUE;
    let maxLen = Number.MIN_VALUE;

    const fileStream = fs.createReadStream('data/weather_stations.csv');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    await skipComments(rl);

    for await (const row of rl) {
        let name = namesList[Math.floor(Math.random() * namesList.length)];

        name = ensureNonSpace(name);
        while (names.has(name)) {
            name = modifyName(name, namesList);
        }

        if (Buffer.from(name).length > MAX_NAME_LEN) {
            name = trimName(name, namesList);
        }

        if (name.includes(';')) {
            throw new Error("Station name contains a semicolon!");
        }

        names.add(name);
        minLen = Math.min(minLen, Buffer.from(name).length);
        maxLen = Math.max(maxLen, Buffer.from(name).length);

        const lat = parseFloat(row.split(';')[1]);
        const avgTemp = 30 * Math.cos(lat * Math.PI / 180) - 10;
        weatherStations.push({ name, avgTemp });
    }

    console.log(`Generated ${weatherStations.length} station names with length from ${minLen} to ${maxLen}`);
    return weatherStations;
}

async function readBigNameFromFile(filename: string): Promise<string[]> {
    const fileStream = fs.createReadStream(filename);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    await skipComments(rl);

    const names: string[] = [];
    for await (const row of rl) {
        const nameEndIndex = row.indexOf(';');
        names.push(row.substring(0, nameEndIndex));
    }

    return names;
}
async function skipComments(rl: readline.Interface): Promise<void> {
    for await (const line of rl) {
        if (!line.startsWith("#")) {
            rl.close();
            break;
        }
    }
}

function ensureNonSpace(name: string): string {
    if (name.startsWith(' ')) {
        name = name.substring(1) + 'A'; // Replacing the first space with 'A'
    }
    if (name.endsWith(' ')) {
        name = 'A' + name.substring(0, name.length - 1); // Replacing the last space with 'A'
    }
    return name;
}
function modifyName(name: string, namesList: string[]): string {
    // Choose a random name from the list and replace a part of the original name
    const randomName = namesList[Math.floor(Math.random() * namesList.length)];
    const namePart = randomName.substring(0, Math.floor(Math.random() * randomName.length));
    return name.substring(0, name.length - namePart.length) + namePart;
}
function trimName(name: string, namesList: string[]): string {
    // Trim the name to the maximum length by randomly replacing parts of it
    while (Buffer.from(name).length > MAX_NAME_LEN) {
        name = modifyName(name, namesList);
    }
    return name;
}

function readNonSpace(nameSource: string[]): string {
    let ch;
    do {
        ch = nameSource[Math.floor(Math.random() * nameSource.length)];
    } while (ch === ' ');
    return ch;
}


main().catch(console.error);
