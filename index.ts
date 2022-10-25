import { serve } from "https://deno.land/std@0.119.0/http/server.ts";

const text = await Deno.readTextFile('liste_francais.txt');
const words = text.split('\n');
const wordToFind = words[Math.floor(Math.random()*words.length)];

async function handler(_req: Request): Promise<Response> {
    try {
        const guess = await extractGuess(_req);
        console.log(`Guess detecté ${guess}.`);
        console.log(`Mot a trouver ${wordToFind}.`);
        const simScore = await similarity(guess, wordToFind);
        return new Response(responseBuilder(guess, simScore));
    } catch (e) {
        console.error(e);
        return new Response("An error occured : ", e);
      }
}

const similarity = async (word1, word2) => {
    
    const body = {
        sim1: word1,
        sim2: word2,
        lang: "fr",
        type: "General Word2Vec",
    };
    const similarityResponse = await fetch(
        "http://nlp.polytechnique.fr/similarityscore",
        {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        }
    );
    const similarityResponseJson = await similarityResponse.json();
    return Number(similarityResponseJson.simscore);
}

const responseBuilder = (word: string, similarity: number) => {
    if (similarity == 1) {
        return `Trouvé ! Le mot était ${word}.`;
      } else if (similarity > 0.5) {
        return `Tu chauffes, ${word} est proche du mot à trouver, score : ${similarity}`;
      } else if (similarity < 0.5) {
        return `T'es froid, ${word} est loin du mot à trouver, score : ${similarity}`;
      }
}


const extractGuess = async (req: Request) => {
    const slackPayload = await req.formData();
    const guess = await slackPayload.get("text")?.toString();
    if (!guess) {
        throw Error("Guess is empty or null");
    }
    return guess;
};

serve(handler);