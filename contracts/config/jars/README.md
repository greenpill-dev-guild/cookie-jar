# Jar metadata files

One JSON object per jar (`name`, `description`, `image`, `link`), read by `script/CreateJar.s.sol`
through the `METADATA_FILE` variable (path relative to `contracts/`). Keep each file on a single
line: the factory stores the string verbatim and the client parses it as JSON.
