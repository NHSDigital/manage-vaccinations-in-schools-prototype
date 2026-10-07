# Manage vaccinations in schools prototype

Manage vaccinations in schools (Mavis) is a digital tool designed to help school age immunisation service (SAIS) teams manage their vaccination programmes end to end.

This is a prototype of the service, built using the [NHS prototype kit](https://prototype-kit.service-manual.nhs.uk).

## Requirements

Node.js v22.21

## Installation

1. Clone this repository

2. Install the dependencies and create data:\
   `npm install`

3. Start the application:\
   `npm start`

## Creating session data

Session data uses pre-compiled JSON files saved to a `.data` folder.

To regenerate this data run:\
`npm run create-data`

Mostly, the generated data comprise randomised records, with distributions of different statuses
governed by weighted probabilities. However, there are also some records generated deterministically
to match scenarios we want to use in research.

### Adding a scenario

1. Add `lib/scenarios/library/<what-it-sets-up>.js`:

   ```js
   export default defineScenario({
     name: 'Flu session at Grange Hill, consent window closing tomorrow', // must be unique
     description: 'Written for researchers and designers, not just devs.',
     run(context, shared) {
       // create sessions / children / replies etc.
       // ...

       // return URLs to any useful pages, with meaningful link text
       return {
         startUrl: session.uri, // a deliberate choice of the best demo entry point
         links: [{ label: 'Session', href: session.uri }]
       }
     }
   })
   ```

2. Import the scenario from the new file and add it to the `scenarios` array in `lib/scenarios/index.js`.
3. Run `npm run create-data` then check `/scenarios` to test links, description, etc.

### Rules of thumb

- **Scenarios are independent; they only use `shared`, never each other's output.** If two scenarios need the same thing (e.g. a school), build it once in `shared-resources.js`, add it to the `SharedResources` typedef in `types.js`, and reserve any IDs in `constants.js`.
- **Create your own children rather than picking from the random pool.** Scenarios run after all random generation, so a random child at a given school may already have consent, vaccinations and so on.
- **Reuse the existing generators and models** (`app/generators/*`, `Model.create`) as `create-data.js` does.
  - Note that `generateSession` looks schools up in `app/datasets/schools.js`, so any school used with it must live in that dataset. Grange Hill does, which also gives it random children and sessions for free.

### How your scenario gets incorporated

After creating all of the randomised data, `lib/create-data.js` calls `createScenarioData()`, which writes `.data/scenarios.json`. `app/data.js` loads that file, and `app/models/scenario.js`, `app/controllers/scenario.js` and `app/views/scenario/list.njk` render the page.
