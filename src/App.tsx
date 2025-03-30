import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemText,
  Paper,
  Autocomplete,
  IconButton,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

interface Journey {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  platform?: string;
  operator?: string;
}

interface Station {
  code: string;
  name: string;
}

function App() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [stationOptions, setStationOptions] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved journeys on component mount
  useEffect(() => {
    const savedJourneys = localStorage.getItem('train_journeys');
    if (savedJourneys) {
      setJourneys(JSON.parse(savedJourneys));
    }
  }, []);

  // Save journeys to localStorage when they change
  useEffect(() => {
    localStorage.setItem('train_journeys', JSON.stringify(journeys));
  }, [journeys]);

  // Search stations when query changes
  useEffect(() => {
    const searchStations = async () => {
      if (searchQuery.length >= 2) {
        try {
          const response = await axios.get(`https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?op=GetStationList`, {
            params: {
              query: searchQuery,
              apiKey: process.env.REACT_APP_RAIL_API_KEY
            }
          });
          setStationOptions(response.data.stations);
        } catch (error) {
          console.error('Error searching stations:', error);
        }
      } else {
        setStationOptions([]);
      }
    };
    searchStations();
  }, [searchQuery]);

  const handleAddJourney = async () => {
    if (!fromStation || !toStation) return;

    setLoading(true);
    try {
      const response = await axios.get(`https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?op=GetDepartureBoard`, {
        params: {
          fromStation: fromStation.code,
          toStation: toStation.code,
          apiKey: process.env.REACT_APP_RAIL_API_KEY
        }
      });
      
      const journey = response.data.journeys[0];
      const newJourney: Journey = {
        id: Date.now().toString(),
        from: fromStation.name,
        to: toStation.name,
        departureTime: journey.departureTime,
        arrivalTime: journey.arrivalTime,
        status: journey.status,
        platform: journey.platform,
        operator: journey.operator
      };

      setJourneys([...journeys, newJourney]);
      setFromStation(null);
      setToStation(null);
    } catch (error) {
      console.error('Error adding journey:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJourney = (id: string) => {
    setJourneys(journeys.filter(journey => journey.id !== id));
  };

  const handleRefreshJourney = async (journey: Journey) => {
    try {
      const response = await axios.get(`https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?op=GetDepartureBoard`, {
        params: {
          fromStation: journey.from,
          toStation: journey.to,
          apiKey: process.env.REACT_APP_RAIL_API_KEY
        }
      });
      
      const updatedJourney = response.data.journeys[0];
      setJourneys(journeys.map(j => 
        j.id === journey.id 
          ? {
              ...j,
              departureTime: updatedJourney.departureTime,
              arrivalTime: updatedJourney.arrivalTime,
              status: updatedJourney.status,
              platform: updatedJourney.platform,
              operator: updatedJourney.operator
            }
          : j
      ));
    } catch (error) {
      console.error(`Error refreshing journey ${journey.id}:`, error);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Train Journey Tracker
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Autocomplete
              options={stationOptions}
              getOptionLabel={(option) => option.name}
              value={fromStation}
              onChange={(_, newValue) => setFromStation(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="From Station"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                />
              )}
              fullWidth
            />
            <Autocomplete
              options={stationOptions}
              getOptionLabel={(option) => option.name}
              value={toStation}
              onChange={(_, newValue) => setToStation(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="To Station"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                />
              )}
              fullWidth
            />
          </Box>
          <Button 
            variant="contained" 
            onClick={handleAddJourney}
            disabled={!fromStation || !toStation || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Add Journey'}
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Saved Journeys
          </Typography>
          <List>
            {journeys.map((journey) => (
              <ListItem
                key={journey.id}
                divider
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      onClick={() => handleRefreshJourney(journey)}
                      sx={{ mr: 1 }}
                    >
                      <RefreshIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteJourney(journey.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={`${journey.from} → ${journey.to}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2">
                        Departure: {new Date(journey.departureTime).toLocaleTimeString()}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2">
                        Status: {journey.status}
                        {journey.platform && ` | Platform: ${journey.platform}`}
                        {journey.operator && ` | Operator: ${journey.operator}`}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
