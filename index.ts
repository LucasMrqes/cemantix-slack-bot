import { serve } from "https://deno.land/std@0.119.0/http/server.ts";

async function handler(_req: Request): Promise<Response> {
    const wordToFind = 'chien';
    const guess = await extractGuess(_req);
    return new Response("similarity(wordToFind, guess).toString()");
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


const extractGuess = async (req: Request) => {
    const slackPayload = await req.formData();
    const guess = await slackPayload.get("text")?.toString();
    if (!guess) {
        throw Error("Guess is empty or null");
    }
    return guess;
};

serve(handler);