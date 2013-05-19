(function () {
    var
        level,
        tileSize = 16,
        player = {},
        mapConversionChart = {
            '0,0,0,255': 'empty',
            '6,237,148,255': 'hedge',
            '0,100,255,255': 'entrance',
            '255,21,0,255': 'spike monster',
            '255,139,10,255': 'exit',
            '255,255,255,255': 'wing monster',
            '8,207,255,255': 'fish monster',
            '188,188,188,255': 'sword item',
            '0,44,150,255': 'torch item',
            '122,13,0,255': 'shield item'
        },
        monsterData = {
            spike: 'shield',
            wing: 'torch',
            fish: 'sword',
            count: 3
        },
        game = document.getElementById('game'),
        gameRender = document.getElementById('game-render'),
        gameNotificationInventoryItem = document.getElementById('game-notification-inventory-item'),
        gameEncounterMonsterPromptItem = document.getElementById('game-encounter-monster-prompt-item');

    game.monster = null;
    game.item = null;

    function loadMap(src, callback) {
        var image = new Image();

        image.onload = function () {
            callback(image);
        }

        image.src = src;
    }

    function readMap(image) {
        var
            canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            imageData,
            i,
            pixel,
            map = [],
            x,
            y;

        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);

        imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        for (i = 0; i < imageData.data.length; i += 4) {
            pixel = Math.floor(i / 4);
            x = pixel % canvas.width;
            y = Math.floor(pixel / canvas.height);
            if (map[x] === undefined) map[x] = [];
            map[x][y] = imageData.data[i] + ',' + imageData.data[i + 1] + ',' + imageData.data[i + 2] + ',' + imageData.data[i + 3];
        }

        return map;
    }

    function convertMap(map, dictionary) {
        var x, y;

        for (x = 0; x < map.length; x += 1) {
            for (y = 0; y < map[x].length; y += 1) {
                map[x][y] = dictionary[map[x][y]];
            }
        }

        return map;
    }

    function buildLevel(map) {
        var
            x,
            y,
            tile,
            width = map.length * tileSize,
            height = map[0].length * tileSize;

        gameRender.style.width = width + 'px';
        gameRender.style.height = height + 'px';

        level.entrance = {};

        for (x = 0; x < map.length; x += 1) {
            for (y = 0; y < map[x].length; y += 1) {
                tile = document.createElement('div');
                gameRender.appendChild(tile);
                tile.className = map[x][y] + ' tile';
                tile.style.top = (y * tileSize) + 'px';
                tile.style.left = (x * tileSize) + 'px';

                if (map[x][y] === 'entrance') {
                    level.entrance.x = x;
                    level.entrance.y = y;
                }
            }
        }

        return level;
    }

    function addKeyboardMovement(object) {

        function move(event) {
            switch (event.keyCode) {
                case 37:
                    object.left();
                    break;
                case 38:
                    object.up();
                    break;
                case 39:
                    object.right();
                    break;
                case 40:
                    object.down();
            }
        }

        window.addEventListener('keydown', move, false);
    }

    function takeItem() {
        if (game.item !== null && player.inventory.contents === null) {
            player.inventory.add(level[player.x][player.y].split(' ')[0]);
            level[player.x][player.y] = 'empty';
            game.changeState('ready');
        }
    }

    function leaveItem() {
        if (game.item !== null && player.inventory.contents === null) game.changeState('ready');
    }

    function fightMonster() {
        if (game.monster === null) return; 
        if (monsterData[game.monster] === player.inventory.contents) {
            game.setAttribute('data-monster-' + game.monster, 'false');
            monsterData.count -= 1;
            game.monster = null;
            player.inventory.empty();
            level[player.x][player.y] = 'empty';
            monsterData.count > 0 ? game.changeState('victory') : game.changeState('has_key');
        } else {
            game.changeState('defeat');
        }
    }

    function fleeMonster() {
        if (game.monster !== null) game.changeState('ready');
    }

    function dataClick() {
        var
            i,
            elements = document.querySelectorAll('*[data-click]');

        for (i = 0; i < elements.length; i += 1) {
            elements.item(i).addEventListener('click', function () {
                console.log(this.getAttribute('data-click'));
                eval(this.getAttribute('data-click'));
            }, false);
        }
    }

    function dataKeybind() {
        var
            i,
            elements = document.querySelectorAll('*[data-click]'),
            element;

        window.addEventListener('keydown', function (e) {
            for (i = 0; i < elements.length; i += 1) {
                element = elements.item(i);
                if (element.getAttribute('data-keybind') === keyDecode(e)) {
                    eval(element.getAttribute('data-click'));
                }
            }
        }, false);
    }

    function collide(x, y) {
        switch (level[x][y]) {
            case 'entrance':
                game.changeState('at_entrance');
                return true;
            case 'exit':
                monsterData.count > 0 ? game.changeState('at_exit') : game.changeState('win');
                return true;
            case 'hedge':
                return true;
            default:
                return false;
        }
    }

    function encounterCheck(x, y) {
        var locationData = level[x][y];

        switch (locationData) {
            case 'spike monster':
            case 'fish monster':
            case 'wing monster':
                game.changeState('encounter ' + locationData);
                game.monster = locationData.split(' ')[0];
                break;
            case 'sword item':
            case 'torch item':
            case 'shield item':
                game.changeState('encounter ' + locationData);
                game.item = locationData.split(' ')[0];
                break;
            default:
                game.changeState('ready');
                game.monster = null;
                game.item = null;
        }
    }

    function dismissNotification() {
        if ((game.item !== null && player.inventory.contents !== null) || game.state === 'victory' || game.state === 'at_entrance' || game.state === 'at_exit' || game.state === 'has_key') game.changeState('ready');
        if (game.state === 'defeat' || game.state === 'win') window.location.reload();
    }

    game.changeState = function (state) {
        game.state = state;
        game.className = state;
    };

    player.start = function () {
        player.element = document.createElement('div');
        gameRender.appendChild(player.element);
        player.element.className = 'player tile';
        player.x = level.entrance.x;
        player.y = level.entrance.y;
        player.render();
        addKeyboardMovement(player);
        game.changeState('ready');
    };

    player.render = function () {
        player.element.style.left = (player.x * tileSize) + 'px';
        player.element.style.top = (player.y * tileSize) + 'px';
    };

    player.left = function () {
        if (!collide(player.x - 1, player.y) && game.state === 'ready') {
            player.x -= 1;
            encounterCheck(player.x, player.y);
            player.render();
        }
    };

    player.up = function () {
        if (!collide(player.x, player.y - 1) && game.state === 'ready') {
            player.y -= 1;
            encounterCheck(player.x, player.y);
            player.render();
        }
    };

    player.right = function () {
        if (!collide(player.x + 1, player.y) && game.state === 'ready') {
            player.x += 1;
            encounterCheck(player.x, player.y);
            player.render();
        }
    };

    player.down = function () {
        if (!collide(player.x, player.y + 1) && game.state === 'ready') {
            player.y += 1;
            encounterCheck(player.x, player.y);
            player.render();
        }
    };

    player.inventory = (function () {
        var inventory = {};

        inventory.contents = null;

        inventory.add = function (item) {
            if (inventory.contents === null) {
                inventory.contents = item;
                game.setAttribute('data-item-' + item, 'false');
                game.setAttribute('data-player-inventory', item);
                gameNotificationInventoryItem.innerHTML = item;
                gameEncounterMonsterPromptItem.innerHTML = item;
            }
        };

        inventory.empty = function () {
            inventory.contents = null;
            game.setAttribute('data-player-inventory', 'none');
            gameNotificationInventoryItem.innerHTML = 'bare hands';
            gameEncounterMonsterPromptItem.innerHTML = 'bare hands';
        };

        return inventory;
    })();

    loadMap('images/map.png', function (image) {
        level = convertMap(readMap(image), mapConversionChart);
        buildLevel(level);
        dataClick();
        dataKeybind();
        player.start();
    });
})()