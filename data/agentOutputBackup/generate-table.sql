drop table if exists measurements;
drop table if exists brc;

-- Load the data and create the 'measurements' table
CREATE OR REPLACE TABLE measurements AS
SELECT * FROM READ_CSV('./data/measurements.txt', header=false, columns= {'station_name':'VARCHAR','measurement':'DOUBLE'}, delim=';');

-- Run calculations and create the 'brc' table with 'station', 'min', 'max', and 'mean'
CREATE OR REPLACE TABLE brc AS
WITH src AS (SELECT station_name AS station,
                    MIN(measurement) AS min,
                    CAST(AVG(measurement) AS DECIMAL(8,1)) AS mean,
                    MAX(measurement) AS max
            FROM measurements
            GROUP BY station_name)
    SELECT station, min, mean, max
    FROM src;