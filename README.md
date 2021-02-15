# mokapot.js

![](https://raw.githubusercontent.com/luuuis/mokapot/master/assets/noun_Moka%20Pot_101129.png)

DRY, reusable and composable test resources for Mocha.

```ecmascript 6
import { mokapot} from 'mokapot'

// pair of Promise-returning functions
const createServer = (dir) => mokapot.async(
  async () => createServerAsync({ workDir: dir() }), // set up
  async (server) => server.closeAsync()              // optional tear down
)

// async generator
const createServerGen = (dir) => mokapot.gen(async function* () {
  const server = await createServerAsync({ workDir: dir() })
  yield server
  await server.closeAsync()
})

// pair of sync functions
const tmpDir = mokapot.sync(
  () => fs.mkdirSync('/tmp/' + Math.random),
  (dir) => fs.rmdirSync(dir)
)

// pair of NodeJS-style functions
const anotherTmpDir = mokapot.node(
  (cb) => fs.mkdir('/tmp/' + Math.random, cb),
  (dir, cb) => fs.rmdir(dir, cb)
)

describe('server test', function () {
  const tmp = mokapot.before(tmpDir)
  const server = mokapot.beforeEach(createServer(tmp))

  it('should respond', function () {
    assert(server() instanceof Server) // get current value
  });
});
```

<sub>Moka Pot icon <a href="https://thenounproject.com/term/moka-pot/101129/">created by Marvin Wilhelm for the Noun Project</a></sub>
