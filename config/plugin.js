'use strict';

/** @type Egg.EggPlugin */
module.exports = {
    mysql: {
        enable: true,
        package: 'egg-mysql',
    },
    sequelize: {
        enable: true,
        package: 'egg-sequelize',
    },
    cors: {
        enable: true,
        package: 'egg-cors'
    },
    redis: {
        enable: true,
        package: 'egg-redis',
    }
    // schedule: {
    //     enable: true,
    //     package: 'egg-schedule',
    // } 

}; 