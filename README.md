# mokapot.js

![](assets/noun_Moka%20Pot_101129.png)

DRY, reusable, composable test resources.

```ecmascript 6
import * as mokapot from './mokapot'

describe('server test', function () {
  const createServer = mokapot.resource<Server>(async function* () {
    const server = await createServerAsync();  // set up
    yield server;                              // yield to the test
    await server.closeAsync()                  // tear down
  });

  const server = mokapot.before(createServer); // or #beforeEach

  it('should respond', function () {
    assert(server() instanceof Server)         // get current value
  });
});
```

<sub>Moka Pot icon <a href="https://thenounproject.com/term/moka-pot/101129/">created by Marvin Wilhelm from the Noun Project</a></sub>