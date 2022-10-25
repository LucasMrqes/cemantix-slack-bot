import { serve } from "https://deno.land/std@0.119.0/http/server.ts";
import {
    json,
    validateRequest,
  } from "https://deno.land/x/sift@0.6.0/mod.ts";
  

const wordId = 346498445402440265;
updateWordToFind();

  async function queryFauna(
    query: string,
  ) {
    // Grab the secret from the environment.
    const token = Deno.env.get("FAUNA_SECRET");
    if (!token) {
      throw new Error("environment variable FAUNA_SECRET not set");
    }
  
    try {
      // Make a POST request to fauna's graphql endpoint with body being
      // the query and its variables.
      const res = await fetch("https://graphql.fauna.com/graphql", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query,
        }),
      });
      const { data, errors } = await res.json();
      if (errors) {
        // Return the first error if there are any.
        return { data, error: errors[0] };
      }
      console.log(data);
  
      return { data };
    } catch (error) {
      return { error };
    }
  }

async function updateWordToFind() {
    const text = await Deno.readTextFile('liste_francais.txt');
    const words = text.split('\n');
    const updatedWord = words[Math.floor(Math.random()*words.length)];
    const query = `mutation {updateWord(id: ${wordId}, data: {word: \"${updatedWord}\"}) {_id word}}`;
    const {data,error} = await queryFauna(query);
    if (error) {
        return error;
    }
    return data;
}

async function getWordToFind() {
    const query = `query {findWordByID(id: ${wordId}) {word}}`;
    const {data,error} = await queryFauna(query);
    if (error) {
        return error;
    }
    return data;
}


async function handler(_req: Request): Promise<Response> {
    try {
        const query = await getWordToFind();
        const wordToFind = query.findWordByID.word;
        console.log(wordToFind);
        const guess = await extractGuess(_req);
        console.log(`Guess detecté ${guess}.`);
        console.log(`Mot a trouver ${wordToFind}.`);
        const simScore = await similarity(guess, wordToFind);
        const formattedResponse = await responseBuilder(guess, simScore);
        return new Response(formattedResponse);
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

const responseBuilder = async (word: string, similarity: number) => {
    if (similarity == 1) {
        updateWordToFind();
        return `Trouvé ! Le mot était ${word}. \n Le mot a changé, rejoue !`;
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